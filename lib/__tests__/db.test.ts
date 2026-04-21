import { describe, it, expect, vi } from 'vitest'

vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn(function () { return { $connect: vi.fn() } })
  return { PrismaClient }
})

describe('db singleton', () => {
  it('exports a PrismaClient instance', async () => {
    const { db } = await import('../db')
    expect(db).toBeDefined()
  })
})
