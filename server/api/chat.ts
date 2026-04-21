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
    ...history.map((m) =>
      m.role === 'user'
        ? { role: 'user' as const, content: m.content }
        : { role: 'assistant' as const, content: m.content },
    ),
    { role: 'user' as const, content: message },
  ]

  let assistantContent = ''

  try {
    const result = await emmaAgent.stream(messages)
    const reader = result.textStream.getReader()

    return stream(c, async (s) => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          assistantContent += value
          await s.write(value)
        }
        await db.message.create({
          data: { userId, role: 'assistant', content: assistantContent },
        })
      } catch (err) {
        console.error('Stream error:', err)
        await s.write('ちょっと魔法が乱れちゃったみたい…もう一度試してね🌸')
      }
    })
  } catch (err) {
    console.error('Agent error:', err)
    return c.json({ error: 'ちょっと魔法が乱れちゃったみたい…もう一度試してね🌸' }, 500)
  }
})

chatRoutes.delete('/', async (c) => {
  const session = await auth()
  if (!session?.user?.id) return c.json({ error: 'Unauthorized' }, 401)

  await db.message.deleteMany({ where: { userId: session.user.id } })
  return c.json({ ok: true })
})
