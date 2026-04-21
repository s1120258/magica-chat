import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'エマとおはなし',
  description: '魔法少女エマとお話しできるチャットアプリ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
