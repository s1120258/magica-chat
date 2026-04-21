import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

// Edge Runtime compatible config (no DB access)
// Used by middleware.ts to avoid importing PrismaClient in Edge Runtime
export const authConfig = {
  providers: [Google],
  session: { strategy: 'jwt' as const },
} satisfies NextAuthConfig
