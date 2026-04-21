import { describe, it, expect, vi } from 'vitest'

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(function () {
    return {
      user: { upsert: vi.fn().mockResolvedValue({ id: 'user-1' }) },
    }
  }),
}))

vi.mock('next-auth', () => ({
  default: vi.fn((config) => ({ config, handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })),
}))

vi.mock('next-auth/providers/google', () => ({ default: vi.fn(() => ({ id: 'google' })) }))

describe('auth config', () => {
  it('exports handlers, auth, signIn, signOut', async () => {
    const mod = await import('../auth')
    expect(mod.handlers).toBeDefined()
    expect(mod.auth).toBeDefined()
    expect(mod.signIn).toBeDefined()
    expect(mod.signOut).toBeDefined()
  })
})
