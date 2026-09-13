import { prisma } from '@/lib/prisma'
import { InspectionStatus, Prisma } from '@prisma/client'

export interface InspectionFilterOptions {
  establishmentId?: string
  inspectorId?: string
  status?: InspectionStatus
  limit?: number
  offset?: number
}

export async function getInspections(options: InspectionFilterOptions = {}) {
  const { establishmentId, inspectorId, status, limit = 50, offset = 0 } = options

  const where: Prisma.InspectionWhereInput = {}

  if (establishmentId) where.establishmentId = establishmentId
  if (inspectorId) where.inspectorId = inspectorId
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      orderBy: { scheduledDate: 'desc' },
      take: limit,
      skip: offset,
      include: {
        establishment: {
          select: { id: true, name: true, type: true, assignedRegion: true, currentRiskScore: true, riskLevel: true },
        },
        inspector: {
          select: { id: true, name: true, email: true },
        },
        violations: true,
      },
    }),
    prisma.inspection.count({ where }),
  ])

  return { items, total }
}

export async function getInspectionById(id: string) {
  return prisma.inspection.findUnique({
    where: { id },
    include: {
      establishment: true,
      inspector: { select: { id: true, name: true, email: true } },
      violations: {
        include: { correctiveActions: true },
      },
      correctiveActions: true,
    },
  })
}

export async function getViolations(options: { establishmentId?: string; severity?: string; limit?: number } = {}) {
  const { establishmentId, limit = 50 } = options
  const where: Prisma.ViolationWhereInput = {}
  if (establishmentId) where.establishmentId = establishmentId

  return prisma.violation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      establishment: { select: { id: true, name: true, assignedRegion: true } },
      inspection: { select: { id: true, scheduledDate: true } },
      correctiveActions: true,
    },
  })
}

export async function getCorrectiveActions(options: { establishmentId?: string; status?: string; limit?: number } = {}) {
  const { establishmentId, limit = 50 } = options
  const where: Prisma.CorrectiveActionWhereInput = {}
  if (establishmentId) where.establishmentId = establishmentId

  return prisma.correctiveAction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      establishment: { select: { id: true, name: true, assignedRegion: true } },
      violation: true,
    },
  })
}
