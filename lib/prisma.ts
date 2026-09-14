import { PrismaClient } from '@prisma/client'

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  console.error('[PRISMA-CRITICAL-ERROR] DATABASE_URL environment variable is missing in production Vercel configuration.')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

globalForPrisma.prisma = prisma

