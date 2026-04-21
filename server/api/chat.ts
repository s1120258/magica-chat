import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { emmaAgent } from '@/lib/mastra'

export const chatRoutes = new Hono()

chatRoutes.post('/', async (c) => {
  const session = await auth()
  if (!session?.user?.id) return c.json({ error: 'Unauthorized' }, 401)

  const { message } = await c.req.json<{ message: string }>()
  if (!message?.trim()) return c.json({ error: 'Message required' }, 400)

  const userId = session.user.id

  const history = await db.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  await db.message.create({
    data: { userId, role: 'user', content: message },
  })

  const messages = [
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ]

  const result = await emmaAgent.stream(messages)

  let assistantContent = ''

  return stream(c, async (s) => {
    const response = result.toDataStreamResponse()
    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      assistantContent += chunk
      await s.write(chunk)
    }

    await db.message.create({
      data: { userId, role: 'assistant', content: assistantContent },
    })
  })
})

chatRoutes.delete('/', async (c) => {
  const session = await auth()
  if (!session?.user?.id) return c.json({ error: 'Unauthorized' }, 401)

  await db.message.deleteMany({ where: { userId: session.user.id } })
  return c.json({ ok: true })
})
