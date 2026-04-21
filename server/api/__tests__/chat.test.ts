import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

const mockFindMany = vi.fn().mockResolvedValue([])
const mockCreate = vi.fn().mockResolvedValue({})
const mockDeleteMany = vi.fn().mockResolvedValue({ count: 0 })
const mockFindUnique = vi.fn().mockResolvedValue({ id: 'user-1' })

vi.mock('@/lib/db', () => ({
  db: {
    message: { findMany: mockFindMany, create: mockCreate, deleteMany: mockDeleteMany },
    user: { findUnique: mockFindUnique },
  },
}))

const mockRead = vi.fn()
  .mockResolvedValueOnce({ done: false, value: 'こんにちは！' })
  .mockResolvedValue({ done: true, value: undefined })

const mockStream = vi.fn().mockResolvedValue({
  textStream: {
    getReader: vi.fn().mockReturnValue({ read: mockRead }),
  },
})

vi.mock('@/lib/mastra', () => ({
  emmaAgent: { stream: mockStream },
}))

const mockAuth = vi.fn().mockResolvedValue({ user: { id: 'user-1', email: 'test@example.com' } })

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

async function getApp() {
  const { chatRoutes } = await import('../chat')
  return new Hono().route('/chat', chatRoutes)
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'user-1', email: 'test@example.com' } })
    mockRead
      .mockReset()
      .mockResolvedValueOnce({ done: false, value: 'こんにちは！' })
      .mockResolvedValue({ done: true, value: undefined })
    mockStream.mockResolvedValue({
      textStream: { getReader: vi.fn().mockReturnValue({ read: mockRead }) },
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const app = await getApp()
    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when message is missing', async () => {
    const app = await getApp()
    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when message is whitespace only', async () => {
    const app = await getApp()
    const res = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    })
    expect(res.status).toBe(400)
  })

  it('saves user message and calls agent with history', async () => {
    mockFindMany.mockResolvedValueOnce([
      { role: 'user', content: '以前のメッセージ' },
    ])
    const app = await getApp()
    await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '新しいメッセージ' }),
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: 'user-1', role: 'user', content: '新しいメッセージ' },
    })
    expect(mockStream).toHaveBeenCalledWith([
      { role: 'user', content: '以前のメッセージ' },
      { role: 'user', content: '新しいメッセージ' },
    ])
  })
})

describe('DELETE /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'user-1', email: 'test@example.com' } })
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const app = await getApp()
    const res = await app.request('/chat', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('deletes messages and returns 200 when authenticated', async () => {
    const app = await getApp()
    const res = await app.request('/chat', { method: 'DELETE' })
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(res.status).toBe(200)
  })
})
