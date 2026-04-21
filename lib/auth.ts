import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        // MongoDB Atlas M0 doesn't support transactions, so upsert() fails.
        // Use findUnique + create/update as separate non-transactional operations.
        const existing = await db.user.findUnique({ where: { email: user.email } })
        const dbUser = existing
          ? await db.user.update({
              where: { email: user.email },
              data: { name: user.name ?? '', image: user.image ?? '' },
            })
          : await db.user.create({
              data: { email: user.email, name: user.name ?? '', image: user.image ?? '' },
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
