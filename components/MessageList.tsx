'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface MessageListProps {
  messages: Message[]
  streaming: boolean
  streamingContent: string
}

export function MessageList({ messages, streaming, streamingContent }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex gap-2 items-start ${msg.role === 'user' ? 'justify-end' : ''}`}
        >
          {msg.role === 'assistant' && (
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border"
              style={{ borderColor: 'var(--accent)' }}>
              <Image src="/images/emma-icon.png" alt="エマ" width={24} height={24} className="object-cover" />
            </div>
          )}
          <div
            className="max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
            style={
              msg.role === 'assistant'
                ? { background: 'var(--emma-bubble)', border: '1px solid var(--emma-border)', color: 'var(--text)', borderRadius: '0 12px 12px 12px' }
                : { background: 'var(--user-bubble)', color: 'var(--text)', borderRadius: '12px 0 12px 12px' }
            }
          >
            {msg.content}
          </div>
        </div>
      ))}

      {streaming && (
        <div className="flex gap-2 items-start">
          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border"
            style={{ borderColor: 'var(--accent)' }}>
            <Image src="/images/emma-icon.png" alt="エマ" width={24} height={24} className="object-cover" />
          </div>
          <div
            className="max-w-[75%] px-3 py-2 text-sm leading-relaxed"
            style={{ background: 'var(--emma-bubble)', border: '1px solid var(--emma-border)', color: 'var(--text)', borderRadius: '0 12px 12px 12px' }}
          >
            {streamingContent || (
              <span data-testid="typing-indicator" className="flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
              </span>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
