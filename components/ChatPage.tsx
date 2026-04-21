'use client'

import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { useState, useCallback } from 'react'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { Toast } from './Toast'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatPageProps {
  initialMessages: Message[]
}

export function ChatPage({ initialMessages }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [toast, setToast] = useState({ message: '', visible: false })

  function showToast(message: string) {
    setToast({ message, visible: true })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000)
  }

  const handleSend = useCallback(async (message: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setStreaming(true)
    setStreamingContent('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!res.ok || !res.body) throw new Error('Network error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let content = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        content += decoder.decode(value, { stream: true })
        setStreamingContent(content)
      }

      setMessages((prev) => [...prev, { role: 'assistant', content }])
    } catch {
      showToast('ちょっと魔法が乱れちゃったみたい…もう一度試してね🌸')
    } finally {
      setStreaming(false)
      setStreamingContent('')
    }
  }, [])

  const handleReset = useCallback(async () => {
    try {
      const res = await fetch('/api/chat', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setMessages([])
      showToast('会話をリセットしたよ！また話しかけてね 🌸')
    } catch {
      showToast('リセットに失敗しちゃった…もう一度試してね')
    }
  }, [])

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: 'var(--hero)', borderBottom: '1px solid var(--emma-border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full overflow-hidden border-2 flex-shrink-0"
            style={{ borderColor: 'var(--accent)' }}
          >
            <Image src="/images/emma-icon.png" alt="エマ" width={36} height={36} className="object-cover" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>エマ</p>
            <p className="text-xs" style={{ color: 'var(--subtext)' }}>魔法少女 ✨</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={streaming}
            className="text-xs px-3 py-1.5 rounded-full border transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            style={{ borderColor: 'var(--accent)', color: 'var(--text)' }}
          >
            🌸 リセット
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-xs px-3 py-1.5 rounded-full border cursor-pointer"
            style={{ borderColor: 'var(--input-border)', color: 'var(--subtext)' }}
          >
            ログアウト
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <MessageList messages={messages} streaming={streaming} streamingContent={streamingContent} />
        <MessageInput onSend={handleSend} disabled={streaming} />
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </main>
  )
}
