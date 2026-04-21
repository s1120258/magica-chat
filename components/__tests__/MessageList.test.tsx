import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MessageList } from '../MessageList'

vi.mock('next/image', () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} /> }))

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const messages = [
  { role: 'assistant' as const, content: 'こんにちは！' },
  { role: 'user' as const, content: 'よろしく！' },
]

describe('MessageList', () => {
  it('renders all messages', () => {
    render(<MessageList messages={messages} streaming={false} streamingContent="" />)
    expect(screen.getByText('こんにちは！')).toBeInTheDocument()
    expect(screen.getByText('よろしく！')).toBeInTheDocument()
  })

  it('shows streaming content when streaming=true', () => {
    render(<MessageList messages={[]} streaming={true} streamingContent="入力中..." />)
    expect(screen.getByText('入力中...')).toBeInTheDocument()
  })

  it('shows typing indicator when streaming and streamingContent is empty', () => {
    render(<MessageList messages={[]} streaming={true} streamingContent="" />)
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
  })
})
