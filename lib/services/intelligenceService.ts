import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface IntelligenceUserSession {
  id?: string
  role?: string
  region?: string | null
  establishmentId?: string | null
}

export interface IntelligenceFilterOptions {
  category?: 'All' | 'Risk' | 'Inspections' | 'Violations' | 'Corrective Actions' | 'Evidence'
  region?: string
  limit?: number
}

export interface IntelligenceEventItem {
  id: string
  type:
    | 'RISK_INCREASED'
    | 'RISK_ASSESSMENT_UPDATED'
    | 'CRITICAL_VIOLATION'
    | 'NEW_VIOLATION'
    | 'INSPECTION_COMPLETED'
    | 'INSPECTION_OVERDUE'
    | 'CORRECTIVE_ACTION_SUBMITTED'
    | 'CORRECTIVE_ACTION_REJECTED'
    | 'CORRECTIVE_ACTION_ACCEPTED'
    | 'EVIDENCE_REVIEW_PENDING'
    | 'EVIDENCE_CANDIDATE_ACCEPTED'
  category: 'Risk' | 'Inspections' | 'Violations' | 'Corrective Actions' | 'Evidence'
  title: string
  establishmentId: string
  establishmentName: string
  city: string
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  explanation: string
  timestamp: Date
  actionText: string
  actionTarget: {
    type: 'establishment' | 'inspection' | 'correctiveAction' | 'evidence'
    id: string
  }
}

export async function getRecentIntelligenceEvents(
  user?: IntelligenceUserSession | null,
  options: IntelligenceFilterOptions = {}
): Promise<IntelligenceEventItem[]> {
  const { category = 'All', region = 'All', limit = 20 } = options

  // Build RBAC & region filter for establishment scoping
  const estWhere: Prisma.EstablishmentWhereInput = {}
  if (user?.role === 'ESTABLISHMENT_MANAGER' && user.establishmentId) {
    estWhere.id = user.establishmentId
  } else if (user?.role === 'FOOD_SAFETY_INSPECTOR' && user.region && user.region !== 'Maharashtra') {
    estWhere.assignedRegion = user.region
  }

  if (region !== 'All' && region !== 'Maharashtra') {
    estWhere.assignedRegion = region
  }

  const events: IntelligenceEventItem[] = []

  // 1. Fetch Risk History Events
  if (category === 'All' || category === 'Risk') {
    const riskHistories = await prisma.riskHistory.findMany({
      where: { establishment: estWhere },
      include: { establishment: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    riskHistories.forEach((rh) => {
      const isHigh = rh.riskLevel === 'CRITICAL' || rh.riskLevel === 'HIGH'
      events.push({
        id: `rh-${rh.id}`,
        type: isHigh ? 'RISK_INCREASED' : 'RISK_ASSESSMENT_UPDATED',
        category: 'Risk',
        title: isHigh ? 'Risk Level Increased' : 'Risk Assessment Updated',
        establishmentId: rh.establishmentId,
        establishmentName: rh.establishment.name,
        city: rh.establishment.city || rh.establishment.assignedRegion,
        severity: rh.riskLevel as any,
        explanation: `Risk score evaluated at ${rh.riskScore}/100 (${rh.riskLevel}): ${rh.reason}`,
        timestamp: rh.createdAt,
        actionText: 'View Intelligence',
        actionTarget: { type: 'establishment', id: rh.establishmentId },
      })
    })
  }

  // 2. Fetch Violation Events
  if (category === 'All' || category === 'Violations') {
    const violations = await prisma.violation.findMany({
      where: { establishment: estWhere },
      include: { establishment: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    violations.forEach((v) => {
      const catTitle = v.category.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
      events.push({
        id: `vio-${v.id}`,
        type: v.severity === 'CRITICAL' ? 'CRITICAL_VIOLATION' : 'NEW_VIOLATION',
        category: 'Violations',
        title: v.severity === 'CRITICAL' ? `Critical Violation (${catTitle})` : `Safety Deficiency Recorded`,
        establishmentId: v.establishmentId,
        establishmentName: v.establishment.name,
        city: v.establishment.city || v.establishment.assignedRegion,
        severity: v.severity as any,
        explanation: `${v.severity} ${catTitle.toLowerCase()} deficiency logged: ${v.description}`,
        timestamp: v.createdAt,
        actionText: 'View Inspection',
        actionTarget: { type: 'inspection', id: v.inspectionId },
      })
    })
  }

  // 3. Fetch Completed Inspection Events
  if (category === 'All' || category === 'Inspections') {
    const inspections = await prisma.inspection.findMany({
      where: {
        establishment: estWhere,
        status: { in: ['SUBMITTED', 'REVIEWED', 'CORRECTIVE_ACTION_REQUIRED', 'RESOLVED'] },
      },
      include: { establishment: true, violations: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    inspections.forEach((insp) => {
      const viosCount = insp.violations.length
      const critCount = insp.violations.filter((v) => v.severity === 'CRITICAL').length
      events.push({
        id: `insp-${insp.id}`,
        type: 'INSPECTION_COMPLETED',
        category: 'Inspections',
        title: 'Inspection Completed',
        establishmentId: insp.establishmentId,
        establishmentName: insp.establishment.name,
        city: insp.establishment.city || insp.establishment.assignedRegion,
        severity: critCount > 0 ? 'CRITICAL' : viosCount > 0 ? 'HIGH' : 'LOW',
        explanation: `Inspection completed with ${viosCount} finding(s) recorded (${critCount} critical). Overall result: ${insp.overallResult || 'PASSED'}.`,
        timestamp: insp.submittedAt || insp.updatedAt,
        actionText: 'View Inspection',
        actionTarget: { type: 'inspection', id: insp.id },
      })
    })
  }

  // 4. Fetch Corrective Action Lifecycle Events
  if (category === 'All' || category === 'Corrective Actions') {
    const actions = await prisma.correctiveAction.findMany({
      where: { establishment: estWhere },
      include: { establishment: true, violation: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    actions.forEach((act) => {
      let type: IntelligenceEventItem['type'] = 'CORRECTIVE_ACTION_SUBMITTED'
      let title = 'Corrective Evidence Submitted'
      let actionText = 'Review Action'

      if (act.status === 'REJECTED' || act.status === 'REINSPECTION_REQUIRED') {
        type = 'CORRECTIVE_ACTION_REJECTED'
        title = 'Corrective Action Rejected'
        actionText = 'Follow-up Required'
      } else if (act.status === 'ACCEPTED' || act.status === 'CLOSED') {
        type = 'CORRECTIVE_ACTION_ACCEPTED'
        title = 'Corrective Action Verified'
        actionText = 'View Action'
      }

      events.push({
        id: `act-${act.id}`,
        type,
        category: 'Corrective Actions',
        title,
        establishmentId: act.establishmentId,
        establishmentName: act.establishment.name,
        city: act.establishment.city || act.establishment.assignedRegion,
        severity: act.status === 'REJECTED' ? 'CRITICAL' : act.status === 'REQUIRED' ? 'HIGH' : 'LOW',
        explanation: `${act.description} (Status: ${act.status}). ${act.reviewNotes || 'Submitted for inspector verification.'}`,
        timestamp: act.reviewedAt || act.submittedAt || act.updatedAt,
        actionText,
        actionTarget: { type: 'correctiveAction', id: act.id },
      })
    })
  }

  // 5. Fetch Evidence Scanner AI Candidate Events
  if (category === 'All' || category === 'Evidence') {
    const evidences = await prisma.evidence.findMany({
      where: { inspection: { establishment: estWhere } },
      include: { inspection: { include: { establishment: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    evidences.forEach((ev) => {
      if (ev.candidateTitle) {
        const isAccepted = ev.reviewStatus === 'ACCEPTED'
        events.push({
          id: `ev-${ev.id}`,
          type: isAccepted ? 'EVIDENCE_CANDIDATE_ACCEPTED' : 'EVIDENCE_REVIEW_PENDING',
          category: 'Evidence',
          title: isAccepted ? 'Inspector Accepted AI Candidate' : 'AI Evidence Candidate Detected',
          establishmentId: ev.inspection.establishmentId,
          establishmentName: ev.inspection.establishment.name,
          city: ev.inspection.establishment.city || ev.inspection.establishment.assignedRegion,
          severity: ev.severityRecommendation as any || 'HIGH',
          explanation: `Gemini AI detected "${ev.candidateTitle}" (${Math.round((ev.candidateConfidence || 0.85) * 100)}% visual confidence). Inspector review: ${ev.reviewStatus}.`,
          timestamp: ev.reviewedAt || ev.uploadedAt || ev.createdAt,
          actionText: 'Review Evidence',
          actionTarget: { type: 'evidence', id: ev.id },
        })
      }
    })
  }

  // Sort events primarily by timestamp descending (newest first)
  const sorted = events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return sorted.slice(0, limit)
}
