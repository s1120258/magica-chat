import { describe, it, expect, vi } from 'vitest'
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

const mockStream = vi.fn().mockResolvedValue({
  textStream: {
    getReader: vi.fn().mockReturnValue({
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: 'こんにちは！' })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    }),
  },
})

vi.mock('@/lib/mastra', () => ({
  emmaAgent: { stream: mockStream },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1', email: 'test@example.com' } }),
}))

describe('DELETE /api/chat', () => {
  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValueOnce(null)

    const { chatRoutes } = await import('../chat')
    const app = new Hono().route('/chat', chatRoutes)
    const res = await app.request('/chat', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('deletes messages and returns 200 when authenticated', async () => {
    const { chatRoutes } = await import('../chat')
    const app = new Hono().route('/chat', chatRoutes)
    const res = await app.request('/chat', { method: 'DELETE' })
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
    expect(res.status).toBe(200)
  })
})
