import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface ReportUserSession {
  id?: string
  role?: string
  region?: string | null
  establishmentId?: string | null
}

export interface ReportFilterOptions {
  period?: '30d' | '90d' | 'all'
  region?: string
}

export async function generateOperationalReport(user?: ReportUserSession | null, filters: ReportFilterOptions = {}) {
  const { period = '30d', region = 'All' } = filters

  // Compute cutoff date
  const now = new Date()
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365
  const periodCutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // 1. Build RBAC & Region filter for establishments
  const estWhere: Prisma.EstablishmentWhereInput = {}

  if (user?.role === 'ESTABLISHMENT_MANAGER' && user.establishmentId) {
    estWhere.id = user.establishmentId
  } else if (user?.role === 'FOOD_SAFETY_INSPECTOR' && user.region && user.region !== 'Maharashtra') {
    estWhere.assignedRegion = user.region
  }

  if (region !== 'All' && region !== 'Maharashtra') {
    estWhere.assignedRegion = region
  }

  // 2. Query establishments with relations
  const establishments = await prisma.establishment.findMany({
    where: estWhere,
    include: {
      violations: {
        orderBy: { createdAt: 'desc' },
      },
      inspections: {
        orderBy: { scheduledDate: 'desc' },
        take: 10,
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
        take: 5,
      },
    },
  })

  // 3. Calculate Executive Summary Metrics
  const totalMonitored = establishments.length
  const requireAttentionEsts = establishments.filter(
    (e) => e.riskLevel === 'CRITICAL' || e.riskLevel === 'HIGH' || e.currentRiskScore >= 65
  )
  const requireAttentionCount = requireAttentionEsts.length

  const overdueInspectionsCount = establishments.filter(
    (e) => e.nextInspectionDate && new Date(e.nextInspectionDate) < now
  ).length

  let allViolations = establishments.flatMap((e) => e.violations)
  const openCriticalViolationsCount = allViolations.filter(
    (v) => v.severity === 'CRITICAL' && (v.resolutionStatus === 'OPEN' || !v.resolvedAt)
  ).length

  let allActions = establishments.flatMap((e) => e.correctiveActions)
  const pendingActionsCount = allActions.filter(
    (a) => a.status === 'REQUIRED' || a.status === 'SUBMITTED' || a.status === 'REINSPECTION_REQUIRED'
  ).length

  const improvingEstsCount = establishments.filter((e) => {
    if (e.riskHistory.length >= 2) {
      return e.riskHistory[0].riskScore < e.riskHistory[e.riskHistory.length - 1].riskScore
    }
    return e.riskLevel === 'LOW' || e.currentRiskScore <= 40
  }).length

  // 4. "What Needs Attention?" Establishments (Top Priority Targets)
  const needsAttentionList = [...establishments]
    .sort((a, b) => b.currentRiskScore - a.currentRiskScore)
    .slice(0, 5)
    .map((e) => {
      const openVios = e.violations.filter((v) => v.resolutionStatus === 'OPEN')
      const recurringVios = e.violations.filter((v) => v.isRecurring)
      const failedActions = e.correctiveActions.filter((a) => a.status === 'REJECTED')
      const isOverdue = e.nextInspectionDate && new Date(e.nextInspectionDate) < now

      const reasons: string[] = []
      if (openVios.length > 0) reasons.push(`${openVios.length} unresolved violation(s) logged`)
      if (recurringVios.length > 0) reasons.push(`Recurring ${recurringVios[0].category.toLowerCase().replace(/_/g, ' ')} deficiency`)
      if (failedActions.length > 0) reasons.push(`Previous corrective action requires re-inspection`)
      if (isOverdue) reasons.push(`Inspection schedule overdue`)
      if (reasons.length === 0) reasons.push(`Elevated risk score trajectory (${e.currentRiskScore}/100)`)

      const prob = Math.min(0.95, Math.max(0.10, e.currentRiskScore / 100))

      return {
        id: e.id,
        name: e.name,
        city: e.city || e.assignedRegion,
        type: e.type,
        riskLevel: e.riskLevel,
        riskScore: e.currentRiskScore,
        probability: prob,
        probabilityPercentage: `${Math.round(prob * 100)}%`,
        reasons,
        recommendedAction: e.riskLevel === 'CRITICAL' ? 'Inspect immediately' : 'Schedule priority inspection',
        drivers: openVios.length > 0 ? ['Unresolved critical violations', 'Cold chain stability'] : ['Sanitation compliance history'],
      }
    })

  // 5. Common Safety Issues (Violation Categories Aggregation)
  const categoryCounts: Record<string, number> = {}
  allViolations.forEach((v) => {
    const cat = v.category || 'SANITATION'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => {
      const formattedName = category
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ')
      const percentage = allViolations.length > 0 ? Math.round((count / allViolations.length) * 100) : 0
      return { category, name: formattedName, count, percentage }
    })

  const topCategoryName = sortedCategories.length > 0 ? sortedCategories[0].name : 'Sanitation'
  const commonIssuesSummary = allViolations.length > 0
    ? `${topCategoryName} issues are currently the most frequently observed safety concern across monitored establishments.`
    : 'No active safety violations recorded in the selected period.'

  // 6. Recurring Problems
  const recurringViolations = allViolations.filter((v) => v.isRecurring)
  const recurringCategoryMap: Record<string, Set<string>> = {}
  recurringViolations.forEach((v) => {
    if (!recurringCategoryMap[v.category]) recurringCategoryMap[v.category] = new Set()
    recurringCategoryMap[v.category].add(v.establishmentId)
  })

  const recurringProblems = Object.entries(recurringCategoryMap).map(([category, estSet]) => {
    const formattedName = category
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ')
    return {
      category,
      name: formattedName,
      affectedCount: estSet.size,
      description: `Repeated issue observed across ${estSet.size} establishment(s).`,
      recommendedAction: 'Schedule focused inspection sweep and verify cooling log sheets.',
    }
  })

  // 7. Corrective Action Progress Lifecycle
  const actionLifecycle = {
    identified: allViolations.length,
    required: allActions.filter((a) => a.status === 'REQUIRED').length,
    submitted: allActions.filter((a) => a.status === 'SUBMITTED').length,
    underReview: allActions.filter((a) => a.status === 'SUBMITTED').length,
    accepted: allActions.filter((a) => a.status === 'ACCEPTED').length,
    rejected: allActions.filter((a) => a.status === 'REJECTED').length,
    reinspectionRequired: allActions.filter((a) => a.status === 'REINSPECTION_REQUIRED').length,
    closed: allActions.filter((a) => a.status === 'CLOSED' || a.status === 'ACCEPTED').length,
  }

  // 8. Compliance Trend Calculation
  let complianceTrendState: 'IMPROVING' | 'STABLE' | 'NEEDS_ATTENTION' | 'INSUFFICIENT_DATA' = 'STABLE'
  let complianceTrendSummary = 'Overall compliance remains stable across active establishments.'

  if (establishments.length === 0) {
    complianceTrendState = 'INSUFFICIENT_DATA'
    complianceTrendSummary = 'Not enough historical data to calculate a reliable compliance trend.'
  } else if (requireAttentionCount > totalMonitored * 0.4) {
    complianceTrendState = 'NEEDS_ATTENTION'
    complianceTrendSummary = 'Compliance needs attention. Multiple establishments show elevated risk scores and open corrective actions.'
  } else if (improvingEstsCount > requireAttentionCount) {
    complianceTrendState = 'IMPROVING'
    complianceTrendSummary = 'Overall compliance is improving. Fewer unresolved issues were recorded in recent inspections.'
  }

  // 9. Regional Overview Breakdown (Maharashtra Cities)
  const regionMap: Record<string, { total: number; atRisk: number; overdue: number; openCritical: number }> = {}
  establishments.forEach((e) => {
    const reg = e.city || e.assignedRegion || 'Solapur'
    if (!regionMap[reg]) {
      regionMap[reg] = { total: 0, atRisk: 0, overdue: 0, openCritical: 0 }
    }
    regionMap[reg].total += 1
    if (e.riskLevel === 'CRITICAL' || e.riskLevel === 'HIGH' || e.currentRiskScore >= 65) {
      regionMap[reg].atRisk += 1
    }
    if (e.nextInspectionDate && new Date(e.nextInspectionDate) < now) {
      regionMap[reg].overdue += 1
    }
    const estCriticalVios = e.violations.filter((v) => v.severity === 'CRITICAL' && v.resolutionStatus === 'OPEN')
    regionMap[reg].openCritical += estCriticalVios.length
  })

  const regionalOverview = Object.entries(regionMap).map(([cityName, data]) => ({
    city: cityName,
    establishments: data.total,
    atRiskCount: data.atRisk,
    overdueCount: data.overdue,
    openCriticalCount: data.openCritical,
  }))

  // 10. Recommended Operational Actions
  const recommendations: Array<{ id: string; title: string; reason: string; priority: 'URGENT' | 'HIGH' | 'ROUTINE' }> = []

  if (needsAttentionList.length > 0) {
    const topTarget = needsAttentionList[0]
    recommendations.push({
      id: 'rec-1',
      title: `Inspect ${topTarget.name} next`,
      reason: `Elevated risk score (${topTarget.riskScore}/100) with ${topTarget.reasons[0] || 'unresolved violations'}.`,
      priority: 'URGENT',
    })
  }

  if (actionLifecycle.submitted > 0) {
    recommendations.push({
      id: 'rec-2',
      title: `Review ${actionLifecycle.submitted} submitted corrective action evidence(s)`,
      reason: 'Establishment managers have submitted evidence awaiting verification.',
      priority: 'HIGH',
    })
  }

  if (actionLifecycle.rejected > 0) {
    recommendations.push({
      id: 'rec-3',
      title: `Follow up on ${actionLifecycle.rejected} rejected corrective action(s)`,
      reason: 'Previous submitted evidence was unsatisfactory and requires re-inspection.',
      priority: 'HIGH',
    })
  }

  if (overdueInspectionsCount > 0) {
    recommendations.push({
      id: 'rec-4',
      title: `Schedule ${overdueInspectionsCount} overdue inspection(s)`,
      reason: 'Establishments have passed their scheduled inspection interval.',
      priority: 'ROUTINE',
    })
  }

  if (sortedCategories.length > 0) {
    recommendations.push({
      id: 'rec-5',
      title: `Conduct targeted ${sortedCategories[0].name.toLowerCase()} compliance sweep`,
      reason: `${sortedCategories[0].name} accounts for ${sortedCategories[0].percentage}% of recorded safety deficiencies.`,
      priority: 'ROUTINE',
    })
  }

  // 11. Insights
  const insights = [
    {
      type: 'key-finding',
      title: 'Primary Risk Factor',
      text: sortedCategories.length > 0 ? `${sortedCategories[0].name} violations are currently the most common issue.` : 'Sanitation logs maintained.',
    },
    {
      type: 'attention-needed',
      title: 'Action Required',
      text: `${requireAttentionCount} establishment(s) require immediate inspection or evidence review.`,
    },
    {
      type: 'positive-movement',
      title: 'Compliance Health',
      text: `${improvingEstsCount} establishment(s) maintain low risk trajectory and clean inspection records.`,
    },
  ]

  return {
    reportPeriod: period,
    lastUpdated: now.toISOString(),
    executiveSummary: {
      totalMonitored,
      requireAttentionCount,
      overdueInspectionsCount,
      openCriticalViolationsCount,
      pendingActionsCount,
      improvingEstsCount,
    },
    needsAttentionList,
    commonSafetyIssues: {
      categories: sortedCategories,
      summary: commonIssuesSummary,
    },
    recurringProblems,
    actionLifecycle,
    complianceTrend: {
      state: complianceTrendState,
      summary: complianceTrendSummary,
    },
    regionalOverview,
    recommendations,
    insights,
  }
}
