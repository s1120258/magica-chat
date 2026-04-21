'use client'

import { useState, type FormEvent } from 'react'

interface MessageInputProps {
  onSend: (message: string) => void
  disabled: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <form
      role="form"
      onSubmit={handleSubmit}
      className="flex gap-2 p-3 border-t"
      style={{ borderColor: 'var(--input-border)', background: 'var(--bg)' }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="メッセージを入力..."
        disabled={disabled}
        className="flex-1 rounded-full px-4 py-2 text-sm outline-none disabled:opacity-50"
        style={{
          background: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          color: 'var(--text)',
        }}
      />
      <button
        type="submit"
        aria-label="送信"
        disabled={disabled || !value.trim()}
        className="w-9 h-9 rounded-full flex items-center justify-center
          text-white transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        style={{ background: 'var(--button-gradient)' }}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>
        </svg>
      </button>
    </form>
  )
}
