import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization: PrismaClient is instantiated only on first access,
// not at module load time. This prevents build failures when DATABASE_URL
// is unavailable during Next.js static analysis.
// DATABASE_URL is passed explicitly because prisma.config.ts is only for
// the CLI tools and is not read by PrismaClient at runtime in Prisma v7.
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    })
  }
  return globalForPrisma.prisma
}

export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrismaClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
