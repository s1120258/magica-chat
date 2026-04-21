import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.user.upsert({
          where: { email: user.email },
          update: { name: user.name ?? '', image: user.image ?? '' },
          create: { email: user.email, name: user.name ?? '', image: user.image ?? '' },
        })
        token.userId = dbUser.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string
      return session
    },
  },
})
