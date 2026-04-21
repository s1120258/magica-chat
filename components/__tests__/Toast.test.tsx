import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Toast } from '../Toast'

describe('Toast', () => {
  it('renders the message when visible', () => {
    render(<Toast message="エラーが発生しました" visible={true} />)
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
  })

  it('is hidden when visible is false', () => {
    render(<Toast message="エラー" visible={false} />)
    const el = screen.getByText('エラー')
    expect(el.parentElement).toHaveClass('opacity-0')
  })
})
