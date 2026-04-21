'use client'

interface ToastProps {
  message: string
  visible: boolean
}

export function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <span
        className="block px-4 py-2 rounded-lg text-sm font-medium"
        style={{
          background: 'var(--user-bubble)',
          color: 'var(--text)',
          border: '1px solid var(--accent)',
        }}
      >
        {message}
      </span>
    </div>
  )
}
