import { describe, it, expect } from 'vitest'

describe('emma agent', () => {
  it('exports an Agent with name Emma', async () => {
    const { emmaAgent } = await import('../emma-agent')
    expect(emmaAgent).toBeDefined()
    expect(emmaAgent.name).toBe('Emma')
  })
})
