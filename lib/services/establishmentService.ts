import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { RiskLevel } from '@/lib/constants'

export interface EstablishmentFilterOptions {
  search?: string
  region?: string
  riskLevel?: RiskLevel
  status?: string
  limit?: number
  offset?: number
}

export async function getEstablishmentCount() {
  return prisma.establishment.count()
}

export async function getEstablishments(options: EstablishmentFilterOptions = {}) {
  const { search, region, riskLevel, status, limit = 50, offset = 0 } = options

  const where: Prisma.EstablishmentWhereInput = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { assignedRegion: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (region && region !== 'All') {
    where.assignedRegion = region
  }

  if (riskLevel) {
    where.riskLevel = riskLevel
  }

  if (status && status !== 'All') {
    where.operatingStatus = status
  }

  const [items, total] = await Promise.all([
    prisma.establishment.findMany({
      where,
      orderBy: { currentRiskScore: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: { violations: true, inspections: true, correctiveActions: true },
        },
      },
    }),
    prisma.establishment.count({ where }),
  ])

  return { items, total }
}

export async function getEstablishmentById(id: string) {
  return prisma.establishment.findUnique({
    where: { id },
    include: {
      inspections: {
        orderBy: { scheduledDate: 'desc' },
        include: { inspector: { select: { id: true, name: true, email: true } } },
      },
      violations: {
        orderBy: { createdAt: 'desc' },
        include: { correctiveActions: true },
      },
      correctiveActions: {
        orderBy: { createdAt: 'desc' },
      },
      riskAssessments: {
        orderBy: { assessedAt: 'desc' },
        take: 5,
      },
      riskHistory: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
}

export async function getCityRiskSummary() {
  const [totalCount, atRiskCount, avgScoreResult, distributionGroup] = await Promise.all([
    prisma.establishment.count(),
    prisma.establishment.count({
      where: {
        riskLevel: { in: [RiskLevel.HIGH, RiskLevel.CRITICAL] },
      },
    }),
    prisma.establishment.aggregate({
      _avg: { currentRiskScore: true },
    }),
    prisma.establishment.groupBy({
      by: ['riskLevel'],
      _count: { id: true },
    }),
  ])

  const distribution = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  }

  for (const group of distributionGroup) {
    if (group.riskLevel in distribution) {
      distribution[group.riskLevel as keyof typeof distribution] = group._count.id
    }
  }

  return {
    totalEstablishments: totalCount,
    atRiskCount,
    averageRiskScore: Math.round(avgScoreResult._avg.currentRiskScore || 0),
    distribution,
  }
}
