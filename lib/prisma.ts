import { PrismaClient } from '@prisma/client'

export function getCleanDatabaseUrl(): {
  url: string | null
  diagnostics: {
    present: boolean
    hasQuotes: boolean
    protocol: string | null
    hasHost: boolean
    isPooler: boolean
    hasSsl: boolean
  }
} {
  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl) {
    return {
      url: null,
      diagnostics: {
        present: false,
        hasQuotes: false,
        protocol: null,
        hasHost: false,
        isPooler: false,
        hasSsl: false,
      },
    }
  }

  const trimmed = rawUrl.trim()
  const hasQuotes = (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  const unquoted = hasQuotes ? trimmed.slice(1, -1).trim() : trimmed

  let protocol: string | null = null
  let hasHost = false
  let isPooler = false
  let hasSsl = false

  try {
    const parsed = new URL(unquoted)
    protocol = parsed.protocol.replace(':', '')
    hasHost = Boolean(parsed.hostname)
    isPooler = parsed.hostname.includes('-pooler') || parsed.hostname.includes('pooler')
    hasSsl = parsed.searchParams.get('sslmode') === 'require' || parsed.searchParams.has('ssl') || unquoted.includes('sslmode')
  } catch {
    protocol = unquoted.startsWith('postgres') ? 'postgresql' : null
    hasHost = unquoted.includes('@')
    isPooler = unquoted.includes('-pooler')
    hasSsl = unquoted.includes('sslmode')
  }

  return {
    url: unquoted,
    diagnostics: {
      present: true,
      hasQuotes,
      protocol,
      hasHost,
      isPooler,
      hasSsl,
    },
  }
}

const dbInfo = getCleanDatabaseUrl()

// Log sanitized diagnostics server-side ONLY (NEVER log credentials or full URL)
console.log('[DB-SANITIZED-DIAGNOSTIC]', {
  DATABASE_URL_present: dbInfo.diagnostics.present ? 'yes' : 'no',
  DATABASE_URL_hasQuotes: dbInfo.diagnostics.hasQuotes ? 'yes' : 'no',
  DATABASE_URL_protocol: dbInfo.diagnostics.protocol || 'unknown',
  hostname_present: dbInfo.diagnostics.hasHost ? 'yes' : 'no',
  pooler_hostname: dbInfo.diagnostics.isPooler ? 'yes' : 'no',
  has_ssl_param: dbInfo.diagnostics.hasSsl ? 'yes' : 'no',
})

if (process.env.NODE_ENV === 'production' && !dbInfo.diagnostics.present) {
  console.error('[PRISMA-CRITICAL-ERROR] DATABASE_URL environment variable is missing in production Vercel configuration.')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(dbInfo.url
      ? {
          datasources: {
            db: {
              url: dbInfo.url,
            },
          },
        }
      : {}),
  })

globalForPrisma.prisma = prisma


