import { NextResponse } from 'next/server'
import { prisma, getCleanDatabaseUrl } from '@/lib/prisma'

export async function GET() {
  const dbInfo = getCleanDatabaseUrl()
  let prismaInitSuccess = false
  let select1Success = false

  try {
    if (prisma) {
      prismaInitSuccess = true
    }
    await prisma.$queryRaw`SELECT 1`
    select1Success = true

    const establishmentCount = await prisma.establishment.count()
    const userCount = await prisma.user.count()

    console.log('[HEALTH-CHECK-SANITIZED-DIAGNOSTIC]', {
      DATABASE_URL_present: dbInfo.diagnostics.present ? 'yes' : 'no',
      DATABASE_URL_protocol: dbInfo.diagnostics.protocol || 'unknown',
      hostname_present: dbInfo.diagnostics.hasHost ? 'yes' : 'no',
      pooler_hostname: dbInfo.diagnostics.isPooler ? 'yes' : 'no',
      prisma_initialization: prismaInitSuccess ? 'success' : 'failure',
      select_1: select1Success ? 'success' : 'failure',
    })

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      metrics: {
        establishments: establishmentCount,
        users: userCount,
      },
    })
  } catch (error: any) {
    console.error('[HEALTH-CHECK-FAILURE]', {
      DATABASE_URL_present: dbInfo.diagnostics.present ? 'yes' : 'no',
      DATABASE_URL_protocol: dbInfo.diagnostics.protocol || 'unknown',
      hostname_present: dbInfo.diagnostics.hasHost ? 'yes' : 'no',
      pooler_hostname: dbInfo.diagnostics.isPooler ? 'yes' : 'no',
      prisma_initialization: prismaInitSuccess ? 'success' : 'failure',
      select_1: select1Success ? 'success' : 'failure',
      error_message: error?.message || 'Unknown database connection error',
    })

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: 'Database connection check failed',
      },
      { status: 500 }
    )
  }
}

