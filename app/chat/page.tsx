import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ChatPage } from '@/components/ChatPage'

export default async function Chat() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const dbMessages = await db.message.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, content: true },
  })

  const messages = dbMessages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  return <ChatPage initialMessages={messages} />
}
