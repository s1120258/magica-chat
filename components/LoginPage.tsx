'use client'

import Image from 'next/image'
import { signIn } from 'next-auth/react'

export function LoginPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-5 px-4"
      style={{ background: 'linear-gradient(135deg, #1a0f2e, #2d1848 60%, #12091e)' }}
    >
      <div className="relative">
        <div
          className="w-24 h-24 rounded-full overflow-hidden border-2 shadow-lg"
          style={{ borderColor: 'var(--accent)', boxShadow: '0 0 20px rgba(232,121,160,0.3)' }}
        >
          <Image
            src="/images/emma-icon.png"
            alt="エマ"
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="absolute -bottom-1 -right-1 text-lg">🌸</span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          エマとおはなし
        </h1>
        <p className="text-sm" style={{ color: 'var(--subtext)' }}>
          ちょっとドジだけど明るい魔法少女のエマと
          <br />
          自由に会話できるよ ✨
        </p>
      </div>

      <button
        onClick={() => signIn('google', { callbackUrl: '/chat' })}
        className="flex items-center gap-3 bg-white text-gray-800 font-semibold
          px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
            fill="#EA4335"
          />
        </svg>
        Googleでログイン
      </button>
    </main>
  )
}
