import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MessageInput } from '../MessageInput'

describe('MessageInput', () => {
  it('calls onSend with input value on submit', () => {
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} disabled={false} />)

    const input = screen.getByPlaceholderText('メッセージを入力...')
    fireEvent.change(input, { target: { value: 'こんにちは' } })
    fireEvent.submit(input.closest('form')!)

    expect(onSend).toHaveBeenCalledWith('こんにちは')
  })

  it('does not call onSend when input is empty', () => {
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} disabled={false} />)
    fireEvent.submit(screen.getByRole('form'))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('disables input and button when disabled=true', () => {
    render(<MessageInput onSend={vi.fn()} disabled={true} />)
    expect(screen.getByPlaceholderText('メッセージを入力...')).toBeDisabled()
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
