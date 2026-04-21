import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatPage } from '../ChatPage'

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt as string} />
  },
}))

function makeStreamResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

describe('ChatPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders initial messages', () => {
    render(
      <ChatPage
        initialMessages={[
          { id: '1', role: 'user', content: 'こんにちは' },
          { id: '2', role: 'assistant', content: 'こんにちは！エマだよ✨' },
        ]}
      />
    )
    expect(screen.getByText('こんにちは')).toBeInTheDocument()
    expect(screen.getByText('こんにちは！エマだよ✨')).toBeInTheDocument()
  })

  it('sends a message and displays streaming response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeStreamResponse(['魔法', 'だよ✨']))
    )

    render(<ChatPage initialMessages={[]} />)

    const input = screen.getByPlaceholderText('メッセージを入力...')
    fireEvent.change(input, { target: { value: 'テスト' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(screen.getByText('テスト')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('魔法だよ✨')).toBeInTheDocument())
  })

  it('shows error toast when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')))

    render(<ChatPage initialMessages={[]} />)

    const input = screen.getByPlaceholderText('メッセージを入力...')
    fireEvent.change(input, { target: { value: 'テスト' } })
    fireEvent.submit(input.closest('form')!)

    await waitFor(() =>
      expect(
        screen.getByText('ちょっと魔法が乱れちゃったみたい…もう一度試してね🌸')
      ).toBeInTheDocument()
    )
  })

  it('resets messages when reset button is clicked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    )

    render(
      <ChatPage
        initialMessages={[{ id: '1', role: 'user', content: '消えるメッセージ' }]}
      />
    )

    expect(screen.getByText('消えるメッセージ')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByText('🌸 リセット'))
    })

    await waitFor(() =>
      expect(screen.queryByText('消えるメッセージ')).not.toBeInTheDocument()
    )
  })
})
