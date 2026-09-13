import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const establishmentCount = await prisma.establishment.count()
    const userCount = await prisma.user.count()

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      metrics: {
        establishments: establishmentCount,
        users: userCount,
      },
    })
  } catch (error) {
    console.error('Health check failed:', error)
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
