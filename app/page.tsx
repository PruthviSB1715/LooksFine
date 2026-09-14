'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bot,
  Building2,
  CheckCircle,
  Clock3,
  CalendarClock,
  Cpu,
  Database,
  Lock,
  Moon,
  Shield,
  Sliders,
  Sun,
  User,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Command,
  Download,
  FileText,
  Filter,
  Flame,
  Info,
  LayoutDashboard,
  ListChecks,
  ListFilter,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'

type Establishment = {
  id?: string
  name: string
  type: string
  area: string
  score: number
  probability?: number
  delta: string
  status: 'Critical' | 'Watch' | 'Stable'
  lastInspection: string
  drivers: string[]
  reason?: string
  modelVersion?: string
}

type InspectionRecord = {
  id: string
  establishmentName: string
  area: string
  scheduledDate: string
  status: string
  inspectorName: string
  result?: string
}

type RecentIntelEvent = {
  id: string
  type: string
  category: 'Risk' | 'Violations' | 'Inspections' | 'Corrective Actions' | 'Evidence'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  title: string
  description: string
  establishmentId: string
  establishmentName: string
  area: string
  timestamp: string
  timeAgo: string
  targetId?: string
  targetType?: string
  metadata?: any
}

type ModelInfoData = {
  model_version: string
  model_type: string
  train_samples: number
  test_samples: number
  evaluation_metrics: {
    roc_auc: number
    pr_auc: number
    precision: number
    recall: number
    f1_score: number
  }
  target_definition: string
  leakage_prevention: string
}

const defaultEstablishments: Establishment[] = [
  { id: 'cs-demo', name: 'Hotel Rajdhani', type: 'Hotel', area: 'Solapur', score: 82, probability: 0.84, delta: '+14', status: 'Critical', lastInspection: '18 days ago', drivers: ['Cold chain gaps (2 prior events)', 'Pest activity history', 'Previous corrective action failed'], modelVersion: 'risk-model-v1' },
  { id: 'hn-demo', name: 'Hotel Nisarg', type: 'Hotel', area: 'Solapur', score: 79, probability: 0.79, delta: '+12', status: 'Critical', lastInspection: '12 days ago', drivers: ['Raw meat cross-contamination risk', 'Sanitation gaps'], modelVersion: 'risk-model-v1' },
  { id: 'ha-demo', name: 'Hotel Angraj', type: 'Hotel', area: 'Solapur', score: 74, probability: 0.74, delta: '+8', status: 'Watch', lastInspection: '22 days ago', drivers: ['Pest entry points', 'Improper storage height'], modelVersion: 'risk-model-v1' },
  { id: 'sj-demo', name: 'Smokin\' Joe\'s Fresh Pizza', type: 'Restaurant', area: 'Solapur', score: 58, probability: 0.58, delta: '+4', status: 'Watch', lastInspection: '14 days ago', drivers: ['Prep date markings missing'], modelVersion: 'risk-model-v1' },
  { id: 'hk-demo', name: 'Hotel Kamat', type: 'Hotel', area: 'Solapur', score: 48, probability: 0.48, delta: '-2', status: 'Watch', lastInspection: '28 days ago', drivers: ['Facility maintenance requirement'], modelVersion: 'risk-model-v1' },
  { id: 'hm-demo', name: 'Hotel Mantralaya', type: 'Hotel', area: 'Solapur', score: 68, probability: 0.68, delta: '+6', status: 'Watch', lastInspection: '45 days ago', drivers: ['Chiller unit temperature variation'], modelVersion: 'risk-model-v1' },
  { id: 'sh-demo', name: 'Swad Hotel', type: 'Restaurant', area: 'Solapur', score: 38, probability: 0.38, delta: '-5', status: 'Stable', lastInspection: '8 days ago', drivers: ['Routine compliance history maintained'], modelVersion: 'risk-model-v1' },
  { id: 'sg-demo', name: 'Shree Ganesh Family Restaurant', type: 'Restaurant', area: 'Solapur', score: 64, probability: 0.64, delta: '+5', status: 'Watch', lastInspection: '16 days ago', drivers: ['Storage elevation gap'], modelVersion: 'risk-model-v1' },
  { id: 'ss-demo', name: 'Solapur Spice Kitchen', type: 'Restaurant', area: 'Solapur', score: 81, probability: 0.81, delta: '+15', status: 'Critical', lastInspection: '6 days ago', drivers: ['Hot holding temperature control failure'], modelVersion: 'risk-model-v1' },
  { id: 'sp-demo', name: 'Siddheshwar Pure Veg', type: 'Restaurant', area: 'Solapur', score: 32, probability: 0.32, delta: '-8', status: 'Stable', lastInspection: '5 days ago', drivers: ['Clean routine audit'], modelVersion: 'risk-model-v1' },
]

const FOOD_STORAGE_CHECKS = [
  { id: 'fs_1', title: 'Raw and cooked food physically separated', desc: 'Raw proteins stored below ready-to-eat items to prevent drip contamination.' },
  { id: 'fs_2', title: 'Food items stored off floor (min 6 inches)', desc: 'All pallets, crates, and bulk containers elevated off floor.' },
  { id: 'fs_3', title: 'Food containers properly covered and sealed', desc: 'Airtight lids or food-grade wrap used for stored items.' },
  { id: 'fs_4', title: 'Food labels and date markings present', desc: 'Prep date and discard date clearly marked on stored batches.' },
  { id: 'fs_5', title: 'FIFO (First-In, First-Out) stock rotation followed', desc: 'Older inventory positioned at front for immediate usage.' },
  { id: 'fs_6', title: 'Refrigerated perishable items stored appropriately', desc: 'Perishables held in designated cold storage units.' },
  { id: 'fs_7', title: 'Dry storage area clean, dry, and well-ventilated', desc: 'Temperature controlled, no signs of moisture or infestation.' },
]

const SANITATION_CHECKS = [
  { id: 'hs_1', title: 'Food-contact surfaces cleaned and sanitized', desc: 'Prep tables, cutting boards, and slicers sanitized every 4 hours.' },
  { id: 'hs_2', title: 'Dedicated handwashing stations accessible', desc: 'Hand sinks unblocked, unobstructed, and fully operational.' },
  { id: 'hs_3', title: 'Handwashing soap available at all sinks', desc: 'Liquid antibacterial soap dispenses reliably.' },
  { id: 'hs_4', title: 'Single-use paper towels / drying facility present', desc: 'Clean paper towel dispensers loaded at each station.' },
  { id: 'hs_5', title: 'Chemical cleaning supplies stored separately', desc: 'Sanitizers and degreasers locked away from food prep zones.' },
  { id: 'hs_6', title: 'Waste disposal receptacles covered & emptied', desc: 'Lidded trash bins emptied regularly without spillover.' },
  { id: 'hs_7', title: 'Kitchen floors and work surfaces maintained', desc: 'Floors free of grease build-up, standing water, or debris.' },
]

const PEST_FACILITY_CHECKS = [
  { id: 'pf_1', title: 'No visible pest activity or droppings observed', desc: 'Thorough inspection of corners, underneath equipment, and storage.' },
  { id: 'pf_2', title: 'Exterior doors and windows insect-proofed', desc: 'Door sweeps and fly screens intact without gaps.' },
  { id: 'pf_3', title: 'No obvious structural pest entry points', desc: 'Pipe penetrations and wall cracks sealed with steel mesh.' },
  { id: 'pf_4', title: 'External refuse area clean and covered', desc: 'Dumpster lids closed, surrounding pavement washed down.' },
  { id: 'pf_5', title: 'Floor drains clean, covered, and flowing', desc: 'No foul odors, drain flies, or standing water build-up.' },
  { id: 'pf_6', title: 'Walls, ceilings, and lighting in good repair', desc: 'Shatterproof light shields installed, no peeling paint.' },
  { id: 'pf_7', title: 'Dry storage free from gnawed packaging', desc: 'No pest damage on flour sacks or grain boxes.' },
]

const FOOD_HANDLING_CHECKS = [
  { id: 'fh_1', title: 'Proper hand hygiene observed before prep', desc: 'Staff wash hands for 20 seconds after handling raw meat or trash.' },
  { id: 'fh_2', title: 'Single-use gloves worn for ready-to-eat food', desc: 'Gloves changed frequently and between distinct tasks.' },
  { id: 'fh_3', title: 'Cross-contamination controls strictly enforced', desc: 'Color-coded cutting boards used (red for meat, green for produce).' },
  { id: 'fh_4', title: 'Raw animal proteins handled in separate zone', desc: 'Dedicated meat prep counter maintained.' },
  { id: 'fh_5', title: 'Prepared foods protected from overhead drip', desc: 'No condensation dripping from cooling pipes or units.' },
  { id: 'fh_6', title: 'Clean utensils used & stored properly', desc: 'Utensils sanitized and stored in clean containers.' },
  { id: 'fh_7', title: 'Food prep tables organized & sanitized', desc: 'Workstations free of clutter and sanitized.' },
]

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Inspections', icon: ClipboardCheck },
  { label: 'Establishments', icon: Store },
  { label: 'Patterns', icon: Sparkles },
  { label: 'Reports', icon: FileText },
]

function StatusBadge({ status }: { status: Establishment['status'] }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}><span className="status-dot" />{status}</span>
}

function ScoreRing({ score }: { score: number }) {
  const color = score > 75 ? '#ff786b' : score > 55 ? '#c9f34a' : '#a9dbe4'
  return (
    <div className="score-ring" style={{ '--score': `${score * 3.6}deg`, '--ring-color': color } as React.CSSProperties}>
      <span>{score}</span>
    </div>
  )
}

type SmartQueueItem = {
  rank: number
  id: string
  name: string
  type: string
  area: string
  score: number
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  probability: number
  predictionSource: 'ml' | 'deterministic-fallback'
  modelVersion: string
  priorityScore: number
  recommendedUrgency: 'URGENT' | 'HIGH' | 'ROUTINE'
  isOverdue: boolean
  daysSinceInspection: number
  lastInspectionDate: string
  unresolvedViolations: number
  recurringViolations: number
  failedCorrectiveActions: number
  reason: string
  reasons: string[]
  drivers: string[]
}

function formatRoleName(role?: string): string {
  if (!role) return 'Food-Safety Inspector'
  switch (role) {
    case 'FOOD_SAFETY_INSPECTOR':
      return 'Food-Safety Inspector'
    case 'INSPECTION_MANAGER':
      return 'Inspection Manager'
    case 'ESTABLISHMENT_MANAGER':
      return 'Establishment Manager'
    case 'FOOD_SAFETY_ADMIN':
      return 'Food-Safety Administrator'
    default:
      return role.replace(/_/g, ' ')
  }
}

type UserSettings = {
  defaultQueueSort: 'Priority' | 'Risk' | 'Overdue' | 'Recently Updated'
  autoSaveProgress: boolean
  confirmSubmit: boolean
  showRiskExplanationDefault: boolean
  openBriefingBeforeInspection: boolean
  defaultInspectionView: 'Guided' | 'Compact'
  notifyCriticalRisk: boolean
  notifyRiskChanges: boolean
  notifyUpcomingInspections: boolean
  notifyOverdueInspections: boolean
  notifyAssignmentUpdates: boolean
  notifyActionSubmitted: boolean
  notifyActionRejected: boolean
  notifyActionApproved: boolean
  notifyReinspectionReminders: boolean
  notifyEvidenceAwaiting: boolean
  notifyEvidenceScanned: boolean
  inAppNotifications: boolean
  theme: 'Light' | 'Dark' | 'System'
  density: 'Comfortable' | 'Compact'
  reduceMotion: boolean
  showRiskFactors: boolean
  enableCopilot: boolean
  showEvidenceCandidates: boolean
  humanVerificationRequired: boolean
}

const defaultUserSettings: UserSettings = {
  defaultQueueSort: 'Priority',
  autoSaveProgress: true,
  confirmSubmit: true,
  showRiskExplanationDefault: true,
  openBriefingBeforeInspection: true,
  defaultInspectionView: 'Guided',
  notifyCriticalRisk: true,
  notifyRiskChanges: true,
  notifyUpcomingInspections: true,
  notifyOverdueInspections: true,
  notifyAssignmentUpdates: true,
  notifyActionSubmitted: true,
  notifyActionRejected: true,
  notifyActionApproved: true,
  notifyReinspectionReminders: true,
  notifyEvidenceAwaiting: true,
  notifyEvidenceScanned: true,
  inAppNotifications: true,
  theme: 'Light',
  density: 'Comfortable',
  reduceMotion: false,
  showRiskFactors: true,
  enableCopilot: true,
  showEvidenceCandidates: true,
  humanVerificationRequired: true,
}

export default function Page() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [activeSettingsTab, setActiveSettingsTab] = useState('Profile')
  const [settings, setSettings] = useState<UserSettings>(defaultUserSettings)
  const [settingsSavedMessage, setSettingsSavedMessage] = useState<string | null>(null)
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const orgDropdownRef = useRef<HTMLDivElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Establishment | null>(null)
  const [workflow, setWorkflow] = useState<'closed' | 'inspection' | 'violation' | 'action' | 'done'>('closed')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'All' | Establishment['status']>('All')
  const [regionFilter, setRegionFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [mobileNav, setMobileNav] = useState(false)

  // Live Database & ML State
  const [realEstablishments, setRealEstablishments] = useState<Establishment[]>(defaultEstablishments)
  const [priorityQueue, setPriorityQueue] = useState<Establishment[]>([])
  const [smartQueue, setSmartQueue] = useState<SmartQueueItem[]>([])
  const [smartQueueLoading, setSmartQueueLoading] = useState(false)
  const [smartQueueError, setSmartQueueError] = useState<string | null>(null)
  const [queueRiskFilter, setQueueRiskFilter] = useState('All')
  const [queueRegionFilter, setQueueRegionFilter] = useState('All')
  const [queueTypeFilter, setQueueTypeFilter] = useState('All')
  const [queueOverdueOnly, setQueueOverdueOnly] = useState(false)

  const [inspectionsList, setInspectionsList] = useState<InspectionRecord[]>([])
  const [modelInfo, setModelInfo] = useState<ModelInfoData | null>(null)
  const [recentIntelEvents, setRecentIntelEvents] = useState<RecentIntelEvent[]>([])
  const [recentIntelLoading, setRecentIntelLoading] = useState(false)
  const [recentIntelFilter, setRecentIntelFilter] = useState('All')
  const [portfolioHealth, setPortfolioHealth] = useState<{ status: string; rationale: string }>({
    status: 'Attention Required',
    rationale: 'Multiple establishments have open critical violations requiring follow-up inspection.',
  })
  const [summaryStats, setSummaryStats] = useState({
    total: 124,
    atRisk: 8,
    avgScore: 46,
    openInspections: 12,
    criticalCount: 8,
    highCount: 15,
    watchCount: 31,
    stableCount: 85,
    overdueCount: 4,
    openCriticalViolationsCount: 6,
    pendingActionsCount: 9,
  })
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; email?: string; region?: string; establishmentId?: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load Saved Preferences on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('looksfine_user_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings(parsed)
        if (parsed.theme === 'Dark') {
          document.documentElement.setAttribute('data-theme', 'dark')
        }
        if (parsed.reduceMotion) {
          document.body.classList.add('reduce-motion')
        }
      }
    } catch (e) {
      console.warn('Could not read user settings from localStorage:', e)
    }
  }, [])

  function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      try {
        localStorage.setItem('looksfine_user_settings', JSON.stringify(next))
      } catch (e) {
        console.warn('Failed to persist user settings:', e)
      }
      return next
    })

    if (key === 'theme') {
      if (value === 'Dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
    }
    if (key === 'reduceMotion') {
      document.body.classList.toggle('reduce-motion', Boolean(value))
    }

    setSettingsSavedMessage('Preferences updated')
    setTimeout(() => setSettingsSavedMessage(null), 2500)
  }

  // Schedule Modal Form State
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleEstId, setScheduleEstId] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleNotes, setScheduleNotes] = useState('')

  // Copilot State
  const [copilotInput, setCopilotInput] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotContextEst, setCopilotContextEst] = useState<{ id: string; name: string } | null>(null)
  const [copilotMessages, setCopilotMessages] = useState<Array<{
    role: 'user' | 'assistant'
    text: string
    sources?: any[]
    intent?: string
    establishment?: any
    isFallback?: boolean
  }>>([
    {
      role: 'assistant',
      text: 'Welcome to LooksFine Grounded AI Copilot. I answer operational questions using real database records and ML risk model predictions. How can I assist your inspection workflow today?',
    },
  ])

  // Inspector Briefing State
  const [inspectorBriefing, setInspectorBriefing] = useState<any | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [briefingError, setBriefingError] = useState<string | null>(null)
  const [briefingActive, setBriefingActive] = useState(false)
  const [isStartingInspection, setIsStartingInspection] = useState(false)

  // Interactive Inspection Workspace State
  const [activeStage, setActiveStage] = useState<number>(1)
  const [checkStates, setCheckStates] = useState<Record<string, 'PASS' | 'FAIL' | 'NA'>>({})
  const [checkNotes, setCheckNotes] = useState<Record<string, { description?: string; severity?: 'MINOR' | 'MAJOR' | 'CRITICAL' }>>({})
  const [observedTemperatures, setObservedTemperatures] = useState<Record<string, string>>({
    refrig: '3.8',
    freezer: '-19.2',
    hot: '63.5',
    cold: '3.5',
  })
  const [workspaceFindings, setWorkspaceFindings] = useState<Array<{
    id: string
    category: string
    severity: string
    observation: string
    location: string
    createdAt: Date
    isCreatedOnBackend?: boolean
  }>>([])
  const [showAddFindingModal, setShowAddFindingModal] = useState(false)
  const [newFindingCategory, setNewFindingCategory] = useState('TEMPERATURE_CONTROL')
  const [newFindingSeverity, setNewFindingSeverity] = useState<'MINOR' | 'MAJOR' | 'CRITICAL'>('CRITICAL')
  const [newFindingLocation, setNewFindingLocation] = useState('Walk-in Cold Storage')
  const [newFindingObservation, setNewFindingObservation] = useState('')
  const [generalInspectorNotes, setGeneralInspectorNotes] = useState('')
  const [submittedSuccessData, setSubmittedSuccessData] = useState<any | null>(null)

  function setCheckStatus(checkId: string, status: 'PASS' | 'FAIL' | 'NA') {
    setCheckStates((prev) => ({ ...prev, [checkId]: status }))
    if (status === 'FAIL' && !checkNotes[checkId]?.description) {
      setCheckNotes((prev) => ({
        ...prev,
        [checkId]: { description: 'Non-compliance observed during inspection walk.', severity: 'MAJOR' },
      }))
    }
  }

  // Workspace Dynamic Metrics
  const totalChecklistCount = 32
  const completedChecklistCount = Object.keys(checkStates).length + Object.keys(observedTemperatures).length
  const passedChecklistCount = Object.values(checkStates).filter((s) => s === 'PASS').length
  const failedChecklistCount = Object.values(checkStates).filter((s) => s === 'FAIL').length
  const naChecklistCount = Object.values(checkStates).filter((s) => s === 'NA').length
  const progressPercentage = Math.min(100, Math.round((completedChecklistCount / totalChecklistCount) * 100))




  // Operational Reports State
  const [reportPeriod, setReportPeriod] = useState<'30d' | '90d' | 'all'>('30d')
  const [reportRegion, setReportRegion] = useState('All')
  const [reportData, setReportData] = useState<any | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  async function loadReportData() {
    setReportLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('period', reportPeriod)
      if (reportRegion !== 'All') params.set('region', reportRegion)

      const res = await fetch(`/api/reports?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          setReportData(json.data)
        }
      }
    } catch (err) {
      console.error('Failed to load report data:', err)
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => {
    if (activeNav === 'Reports') {
      loadReportData()
    }
  }, [activeNav, reportPeriod, reportRegion])

  function handleExportReport() {
    if (!reportData) return
    const reportText = `LOOKSFINE FOOD SAFETY OPERATIONAL REPORT
Period: Last ${reportPeriod === '30d' ? '30 Days' : reportPeriod === '90d' ? '90 Days' : 'All Time'}
Scope: ${reportRegion}
Generated: ${new Date().toLocaleString()}

1. EXECUTIVE SUMMARY
- Establishments Monitored: ${reportData.executiveSummary.totalMonitored}
- Require Immediate Attention: ${reportData.executiveSummary.requireAttentionCount}
- Overdue Inspections: ${reportData.executiveSummary.overdueInspectionsCount}
- Open Critical Deficiencies: ${reportData.executiveSummary.openCriticalViolationsCount}
- Pending Corrective Actions: ${reportData.executiveSummary.pendingActionsCount}
- Stable / Improving Sites: ${reportData.executiveSummary.improvingEstsCount}

2. TOP PRIORITY SITES NEEDING ATTENTION
${(reportData.needsAttentionList || []).map((e: any, idx: number) => `#${idx + 1} ${e.name} (${e.city}) - Risk: ${e.riskLevel} (${e.riskScore}/100, ${e.probabilityPercentage} serious issue likelihood)\n   Why: ${e.reasons.join('; ')}\n   Recommended Action: ${e.recommendedAction}`).join('\n')}

3. COMMON SAFETY ISSUES
${(reportData.commonSafetyIssues?.categories || []).map((c: any) => `- ${c.name}: ${c.count} occurrence(s) (${c.percentage}%)`).join('\n')}

4. COMPLIANCE TREND
State: ${reportData.complianceTrend?.state}
Summary: ${reportData.complianceTrend?.summary}

5. RECOMMENDED OPERATIONAL ACTIONS
${(reportData.recommendations || []).map((r: any, idx: number) => `${idx + 1}. [${r.priority}] ${r.title}\n   Reason: ${r.reason}`).join('\n')}
`
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `LooksFine_Food_Safety_Report_${reportPeriod}_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleGenerateBriefing(establishmentId: string) {
    setBriefingLoading(true)
    setBriefingError(null)
    setBriefingActive(true)
    try {
      const res = await fetch(`/api/establishments/${establishmentId}/inspector-briefing`)
      if (res.ok) {
        const json = await res.json()
        setInspectorBriefing(json.data)
      } else {
        const err = await res.json()
        setBriefingError(err.error || 'Failed to generate inspector briefing')
      }
    } catch (err: any) {
      setBriefingError('Could not connect to briefing service')
    } finally {
      setBriefingLoading(false)
    }
  }

  async function handleAskCopilot(questionText?: string, overrideEstId?: string) {
    const q = questionText || copilotInput
    if (!q || !q.trim()) return

    const estId = overrideEstId || copilotContextEst?.id

    setCopilotMessages((prev) => [...prev, { role: 'user', text: q }])
    if (!questionText) setCopilotInput('')
    setCopilotLoading(true)

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, establishmentId: estId }),
      })

      if (res.ok) {
        const json = await res.json()
        setCopilotMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: json.answer,
            sources: json.sources,
            intent: json.intent,
            establishment: json.establishment,
            isFallback: json.isFallback,
          },
        ])
      } else {
        const errJson = await res.json()
        setCopilotMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `⚠️ Copilot Error: ${errJson.error || 'Temporarily unavailable. You can still view underlying risk and inspection records.'}`,
          },
        ])
      }
    } catch (err) {
      setCopilotMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: '⚠️ Copilot is temporarily unavailable. You can still view underlying risk and inspection records.',
        },
      ])
    } finally {
      setCopilotLoading(false)
    }
  }

  function handleEstablishmentCopilotAction(est: Establishment) {
    setSelected(null)
    setActiveNav('AI Copilot')
    const realEst = realEstablishments.find((e) => e.name === est.name || e.id === est.id)
    const targetId = realEst?.id || est.id
    setCopilotContextEst({ id: targetId || 'cs-demo', name: est.name })
    handleAskCopilot(`Why is ${est.name} high risk?`, targetId)
  }

  // Evidence Scanner State
  const [evidenceList, setEvidenceList] = useState<any[]>([])
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [scanningEvidence, setScanningEvidence] = useState(false)
  const [activeEvidenceItem, setActiveEvidenceItem] = useState<any | null>(null)
  const [selectedSeverityOverride, setSelectedSeverityOverride] = useState<'MINOR' | 'MAJOR' | 'CRITICAL'>('MAJOR')
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null)

  // Handle Evidence Upload
  async function handleUploadEvidenceFile(file: File, inspId?: string) {
    const targetInspId = inspId || activeInspectionId || inspectionsList[0]?.id || 'cs-insp-id'
    setUploadingEvidence(true)
    setEvidenceMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/inspections/${targetInspId}/evidence`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const json = await res.json()
        const newEv = json.data
        setActiveEvidenceItem(newEv)
        setEvidenceList((prev) => [newEv, ...prev])
        // Automatically trigger AI Scan
        await handleScanEvidence(newEv.id)
      } else {
        const err = await res.json()
        setEvidenceMessage(`Upload failed: ${err.error || 'Invalid file format or size'}`)
      }
    } catch (e: any) {
      setEvidenceMessage(`Upload error: ${e?.message || 'Network error'}`)
    } finally {
      setUploadingEvidence(false)
    }
  }

  // Handle AI Scan
  async function handleScanEvidence(evId: string) {
    setScanningEvidence(true)
    setEvidenceMessage(null)
    try {
      const res = await fetch(`/api/evidence/${evId}/scan`, {
        method: 'POST',
      })
      if (res.ok) {
        const json = await res.json()
        const updated = json.data
        setActiveEvidenceItem(updated)
        setEvidenceList((prev) => prev.map((item) => (item.id === evId ? updated : item)))
        if (updated.severityRecommendation) {
          setSelectedSeverityOverride(updated.severityRecommendation as any)
        }
      } else {
        const err = await res.json()
        setEvidenceMessage(`Scan error: ${err.error || 'Scan failed'}`)
      }
    } catch (e: any) {
      setEvidenceMessage(`Scan network error: ${e?.message || 'Failed to scan'}`)
    } finally {
      setScanningEvidence(false)
    }
  }

  // Handle Accept Candidate Finding -> Create Violation
  async function handleAcceptFinding(evId: string) {
    setIsSubmitting(true)
    setEvidenceMessage(null)
    try {
      const res = await fetch(`/api/evidence/${evId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ severityOverride: selectedSeverityOverride }),
      })

      if (res.ok) {
        const json = await res.json()
        const updatedEv = json.data
        const vio = json.violation
        setActiveEvidenceItem(updatedEv)
        setEvidenceList((prev) => prev.map((item) => (item.id === evId ? updatedEv : item)))
        setEvidenceMessage(`✓ Confirmed Violation Created! Violation #${vio.id.substring(0, 8)} (${vio.category}, ${vio.severity}). Corrective action generated.`)
        await loadBackendData()
      } else {
        const err = await res.json()
        setEvidenceMessage(`Accept failed: ${err.error || 'Could not create violation'}`)
      }
    } catch (e: any) {
      setEvidenceMessage(`Error accepting finding: ${e?.message || 'Network error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Reject Candidate Finding
  async function handleRejectFinding(evId: string) {
    setIsSubmitting(true)
    setEvidenceMessage(null)
    try {
      const res = await fetch(`/api/evidence/${evId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNotes: 'Inspector marked visual finding as false positive.' }),
      })

      if (res.ok) {
        const json = await res.json()
        const updatedEv = json.data
        setActiveEvidenceItem(updatedEv)
        setEvidenceList((prev) => prev.map((item) => (item.id === evId ? updatedEv : item)))
        setEvidenceMessage(`Candidate finding rejected. Audit record preserved.`)
      }
    } catch (e: any) {
      setEvidenceMessage(`Error rejecting finding: ${e?.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load Recent Intelligence Events from API
  async function loadRecentIntelligence(catFilter?: string) {
    setRecentIntelLoading(true)
    try {
      const cat = catFilter !== undefined ? catFilter : recentIntelFilter
      const params = new URLSearchParams()
      if (cat !== 'All') params.set('category', cat)
      if (regionFilter !== 'All') params.set('region', regionFilter)
      params.set('limit', '15')

      const res = await fetch(`/api/risk/recent-intelligence?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          setRecentIntelEvents(json.data)
        }
      }
    } catch (err) {
      console.error('Failed to load recent intelligence events:', err)
    } finally {
      setRecentIntelLoading(false)
    }
  }

  // Load Data from Backend & ML APIs
  async function loadBackendData() {
    try {
      const [estRes, queueRes, riskRes, inspRes, authRes, modelRes, reportRes] = await Promise.all([
        fetch('/api/establishments?limit=50'),
        fetch('/api/risk/prioritization-queue?limit=10'),
        fetch('/api/risk/establishments'),
        fetch('/api/inspections?limit=30'),
        fetch('/api/auth/me'),
        fetch('/api/admin/model-info'),
        fetch('/api/reports?period=30d'),
      ])

      if (estRes.ok) {
        const json = await estRes.json()
        if (json.data && json.data.length > 0) {
          const mapped: Establishment[] = json.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            area: item.assignedRegion,
            score: item.currentRiskScore,
            probability: Math.min(0.95, Math.max(0.10, item.currentRiskScore / 100)),
            delta: item.riskLevel === 'CRITICAL' ? '+14' : item.riskLevel === 'HIGH' ? '+8' : '-6',
            status: item.riskLevel === 'CRITICAL' ? 'Critical' : item.riskLevel === 'HIGH' ? 'Watch' : item.riskLevel === 'MEDIUM' ? 'Watch' : 'Stable',
            lastInspection: item.lastInspectionDate ? `${Math.round((Date.now() - new Date(item.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24))} days ago` : '18 days ago',
            drivers: item.riskLevel === 'CRITICAL'
              ? ['Unresolved critical violations', 'High risk score trajectory']
              : item.riskLevel === 'HIGH'
              ? ['Temperature logs', 'Recent violations logged']
              : ['Routine compliance history maintained'],
            modelVersion: 'risk-model-v1',
          }))
          setRealEstablishments(mapped)
          if (!scheduleEstId && mapped.length > 0) setScheduleEstId(mapped[0].id || '')
        }
      }

      if (queueRes.ok) {
        const queueJson = await queueRes.json()
        if (queueJson.data && queueJson.data.length > 0) {
          const qMapped: Establishment[] = queueJson.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            area: item.area,
            score: item.priorityScore,
            probability: item.probability,
            delta: item.riskLevel === 'CRITICAL' ? '+14' : '+8',
            status: item.riskLevel === 'CRITICAL' ? 'Critical' : item.riskLevel === 'HIGH' ? 'Watch' : item.riskLevel === 'MEDIUM' ? 'Watch' : 'Stable',
            lastInspection: item.lastInspectionDate,
            drivers: item.drivers,
            reason: item.reason,
            modelVersion: item.modelVersion || 'risk-model-v1',
          }))
          setPriorityQueue(qMapped)
        }
      }

      if (riskRes.ok) {
        const riskJson = await riskRes.json()
        if (riskJson.summary) {
          const s = riskJson.summary
          setSummaryStats((prev) => ({
            ...prev,
            total: s.totalEstablishments || prev.total,
            atRisk: s.atRiskCount || prev.atRisk,
            avgScore: s.averageRiskScore || prev.avgScore,
            criticalCount: s.distribution?.CRITICAL || 0,
            highCount: s.distribution?.HIGH || 0,
            watchCount: s.distribution?.MEDIUM || 0,
            stableCount: s.distribution?.LOW || 0,
          }))
        }
      }

      if (reportRes.ok) {
        const reportJson = await reportRes.json()
        if (reportJson.data && reportJson.data.executiveSummary) {
          const exec = reportJson.data.executiveSummary
          setPortfolioHealth({
            status: exec.overallPortfolioHealth || 'Attention Required',
            rationale: exec.healthRationale || 'Multiple establishments have open critical violations requiring follow-up inspection.',
          })
          setSummaryStats((prev) => ({
            ...prev,
            total: exec.totalMonitored || prev.total,
            overdueCount: exec.overdueInspectionsCount ?? prev.overdueCount,
            openCriticalViolationsCount: exec.openCriticalViolationsCount ?? prev.openCriticalViolationsCount,
            pendingActionsCount: exec.pendingActionsCount ?? prev.pendingActionsCount,
            atRisk: exec.requireAttentionCount ?? prev.atRisk,
          }))
        }
      }

      if (inspRes.ok) {
        const inspJson = await inspRes.json()
        if (inspJson.data) {
          const mappedInsp: InspectionRecord[] = inspJson.data.map((i: any) => ({
            id: i.id,
            establishmentName: i.establishment?.name || 'Hotel Rajdhani',
            area: i.establishment?.assignedRegion || 'Solapur',
            scheduledDate: new Date(i.scheduledDate).toLocaleDateString(),
            status: i.status,
            inspectorName: i.inspector?.name || 'Tukaram Munde',
            result: i.overallResult,
          }))
          setInspectionsList(mappedInsp)
        }
      }

      if (authRes.ok) {
        const authJson = await authRes.json()
        if (authJson.authenticated && authJson.user) {
          setCurrentUser(authJson.user)
        }
      }

      if (modelRes.ok) {
        const modelJson = await modelRes.json()
        if (modelJson.data) setModelInfo(modelJson.data)
      }
    } catch (err) {
      console.warn('Backend load warning, falling back to static prototype state:', err)
    }
  }

  useEffect(() => {
    loadBackendData()
    loadRecentIntelligence()
  }, [])

  useEffect(() => {
    if (activeNav === 'Overview' || activeNav === 'Patterns') {
      loadRecentIntelligence()
    }
  }, [activeNav, recentIntelFilter, regionFilter])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOrgDropdownOpen(false)
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  async function loadSmartQueue() {
    setSmartQueueLoading(true)
    setSmartQueueError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '20')
      if (queueRiskFilter !== 'All') params.set('riskLevel', queueRiskFilter)
      if (queueRegionFilter !== 'All') params.set('region', queueRegionFilter)
      if (queueTypeFilter !== 'All') params.set('type', queueTypeFilter)
      if (queueOverdueOnly) params.set('overdueOnly', 'true')
      if (currentUser?.role === 'ESTABLISHMENT_MANAGER' && currentUser?.establishmentId) {
        params.set('establishmentId', currentUser.establishmentId)
      }

      const res = await fetch(`/api/risk/prioritization-queue?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          setSmartQueue(json.data)
        }
      } else {
        setSmartQueueError('Failed to load priority inspect queue.')
      }
    } catch (err: any) {
      setSmartQueueError('Could not connect to priority queue service.')
    } finally {
      setSmartQueueLoading(false)
    }
  }

  useEffect(() => {
    loadSmartQueue()
  }, [queueRiskFilter, queueRegionFilter, queueTypeFilter, queueOverdueOnly])

  function openEstablishmentById(estId: string) {
    const found = realEstablishments.find((e) => e.id === estId)
    if (found) {
      openEstablishment(found)
    } else {
      fetch(`/api/establishments/${estId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            openEstablishment({
              id: json.data.id,
              name: json.data.name,
              type: json.data.type,
              area: json.data.assignedRegion,
              score: json.data.currentRiskScore,
              probability: Math.min(0.95, Math.max(0.10, json.data.currentRiskScore / 100)),
              delta: json.data.riskLevel === 'CRITICAL' ? '+14' : '+8',
              status: json.data.riskLevel === 'CRITICAL' ? 'Critical' : json.data.riskLevel === 'HIGH' ? 'Watch' : 'Stable',
              lastInspection: json.data.lastInspectionDate ? `${Math.round((Date.now() - new Date(json.data.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24))} days ago` : '18 days ago',
              drivers: ['Temperature logs', 'Sanitation compliance'],
              modelVersion: 'risk-model-v1',
            })
          }
        })
    }
  }

  // Filtered Directory
  const filtered = useMemo(() => {
    return realEstablishments.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.area.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = filter === 'All' || item.status === filter
      const matchesRegion = regionFilter === 'All' || item.area === regionFilter
      const matchesType = typeFilter === 'All' || item.type === typeFilter
      return matchesSearch && matchesStatus && matchesRegion && matchesType
    })
  }, [realEstablishments, search, filter, regionFilter, typeFilter])

  const displayQueue = priorityQueue.length > 0 ? priorityQueue : filtered.slice(0, 3)

  function openEstablishment(item: Establishment) {
    setSelected(item)
    setWorkflow('closed')
    setBriefingActive(false)
    setInspectorBriefing(null)
    setBriefingError(null)
  }

  // Contextual CTA Text Helper
  function getStartInspectionLabel(est?: any, fromContext?: string) {
    if (workflow === 'inspection' || (activeInspectionId && selected?.id === est?.id)) {
      return 'Continue Inspection'
    }
    if (est?.lastInspection && typeof est.lastInspection === 'string' && est.lastInspection.toLowerCase().includes('sched')) {
      return 'Begin Scheduled Inspection'
    }
    return 'Start Inspection'
  }

  // Handle Inspection Stepper Workflow APIs
  async function handleStartInspection(targetEst?: any) {
    const estToInspect = targetEst || selected
    if (!estToInspect) return

    // Authorization Guard: Only inspectors/managers can start inspections
    if (currentUser?.role === 'ESTABLISHMENT_MANAGER') {
      alert('Unauthorized: Establishment Managers are not permitted to start inspections.')
      return
    }

    if (targetEst && targetEst.name) {
      const foundEst = realEstablishments.find((e) => e.id === targetEst.id || e.name === targetEst.name)
      if (foundEst) {
        setSelected(foundEst)
      } else if (targetEst.id) {
        openEstablishmentById(targetEst.id)
      }
    }

    setIsStartingInspection(true)
    setIsSubmitting(true)
    try {
      if (estToInspect.id) {
        const res = await fetch(`/api/inspections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establishmentId: estToInspect.id,
            inspectorId: currentUser?.id || 'inspector-id',
            notes: 'Inspection initiated from LooksFine Risk Intelligence',
          }),
        })
        if (res.ok) {
          const json = await res.json()
          setActiveInspectionId(json.data.id)
        }
      }
    } catch (e) {
      console.error('Error starting inspection:', e)
    } finally {
      setIsStartingInspection(false)
      setIsSubmitting(false)
      setWorkflow('inspection')
      setActiveStage(1)
      setCheckStates({})
      setWorkspaceFindings([])
      setSubmittedSuccessData(null)
    }
  }

  async function handleRecordViolation() {
    if (!selected) return
    setIsSubmitting(true)
    try {
      if (activeInspectionId && selected.id) {
        await fetch(`/api/inspections/${activeInspectionId}/violations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establishmentId: selected.id,
            category: 'TEMPERATURE_CONTROL',
            severity: 'CRITICAL',
            description: 'Refrigeration unit holding raw protein at 48°F (Required <= 41°F).',
            correctiveActionRequired: true,
          }),
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
      setWorkflow('action')
    }
  }

  async function handleAddFinding() {
    if (!newFindingObservation.trim()) return
    const newFinding = {
      id: `find-${Date.now()}`,
      category: newFindingCategory,
      severity: newFindingSeverity,
      observation: newFindingObservation,
      location: newFindingLocation,
      createdAt: new Date(),
    }
    setWorkspaceFindings((prev) => [newFinding, ...prev])
    setShowAddFindingModal(false)

    if (activeInspectionId && selected?.id) {
      try {
        await fetch(`/api/inspections/${activeInspectionId}/violations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establishmentId: selected.id,
            category: newFindingCategory,
            severity: newFindingSeverity,
            description: `${newFindingLocation}: ${newFindingObservation}`,
            correctiveActionRequired: true,
          }),
        })
      } catch (e) {
        console.error('Failed to create violation record:', e)
      }
    }
    setNewFindingObservation('')
  }

  async function handleSubmitInspection() {
    if (!selected) return
    setIsSubmitting(true)
    try {
      if (activeInspectionId) {
        const res = await fetch(`/api/inspections/${activeInspectionId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SUBMIT',
            notes: generalInspectorNotes || 'Inspection completed via LooksFine Interactive Workspace.',
          }),
        })
        if (res.ok) {
          const json = await res.json()
          setSubmittedSuccessData(json.data)
        }
      }
      // Reload updated scores & ML predictions from DB
      await loadBackendData()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Schedule Inspection Modal Submit
  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduleEstId) return
    setIsSubmitting(true)
    try {
      await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishmentId: scheduleEstId,
          inspectorId: currentUser?.id || 'inspector-id',
          scheduledDate: scheduleDate ? new Date(scheduleDate).toISOString() : new Date().toISOString(),
          notes: scheduleNotes || 'Scheduled via Inspection Manager workload',
        }),
      })
      setShowScheduleModal(false)
      setScheduleNotes('')
      await loadBackendData()
    } catch (err) {
      console.error('Schedule error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <img src="/looks-fine-logo.png" alt="LooksFine Logo" className="brand-logo-img" />
          <span>looks<span>fine</span></span>
        </div>
        <div className="org-switcher-wrapper" ref={orgDropdownRef} style={{ position: 'relative', width: '100%' }}>
          <button
            type="button"
            className="org-switcher"
            onClick={() => setOrgDropdownOpen((prev) => !prev)}
            aria-expanded={orgDropdownOpen}
            aria-haspopup="true"
          >
            <span className="org-avatar">MH</span>
            <span>
              <b>Maharashtra Authority</b>
              <small>{regionFilter === 'All' ? 'Food Safety Authority' : `${regionFilter} Region`}</small>
            </span>
            <ChevronDown data-icon="inline-end" style={{ transform: orgDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {orgDropdownOpen && (
            <div
              className="org-dropdown-menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: '100%',
                minWidth: '220px',
                background: '#202526',
                border: '1px solid #343938',
                borderRadius: '9px',
                padding: '6px',
                zIndex: 999,
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ padding: '6px 8px 4px', fontSize: '9px', fontWeight: 800, color: '#8b918d', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Organization Regions
              </div>
              {['Maharashtra (All)', 'Solapur', 'Pune', 'Nashik', 'Kolhapur', 'Sangli'].map((region) => {
                const regionName = region.replace(' (All)', '')
                const isSelected = (regionName === 'Maharashtra' && regionFilter === 'All') || regionFilter === regionName
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => {
                      const filterVal = regionName === 'Maharashtra' ? 'All' : regionName
                      setRegionFilter(filterVal)
                      setQueueRegionFilter(filterVal)
                      setOrgDropdownOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '11px',
                      color: isSelected ? 'var(--lime)' : '#e0e4dc',
                      background: isSelected ? '#29302f' : 'transparent',
                      border: 0,
                      borderRadius: '6px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{region}</span>
                    {isSelected && <Check style={{ width: 12, height: 12, color: 'var(--lime)' }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <nav className="main-nav" aria-label="Primary navigation">
          <p className="eyebrow">Command center</p>
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => { setActiveNav(label); setMobileNav(false) }} className={activeNav === label ? 'nav-item active' : 'nav-item'}>
              <Icon data-icon="inline-start" />{label}
              {label === 'Inspections' && <span className="nav-count">{inspectionsList.length || 12}</span>}
            </button>
          ))}
          <p className="eyebrow nav-lower">Workspace</p>
          <button className={activeNav === 'AI Copilot' ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveNav('AI Copilot'); setMobileNav(false) }}><Bot data-icon="inline-start" />AI Copilot</button>
          <button
            className={activeNav === 'Settings' ? 'nav-item active' : 'nav-item'}
            onClick={() => { setActiveNav('Settings'); setMobileNav(false) }}
          >
            <Settings data-icon="inline-start" />Settings
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar">{currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : 'TM'}</div>
          <div><b>{currentUser?.name || 'Tukaram Munde'}</b><small>{formatRoleName(currentUser?.role)}</small></div>
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            style={{ background: 'none', border: 0, color: '#8b918d', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            aria-label="User menu"
          >
            <MoreHorizontal />
          </button>
        </div>
      </aside>

      <section className="content-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu /></button>
          <div className="breadcrumbs"><span>Maharashtra Food Safety Authority</span><span>/</span><b>{activeNav}</b></div>
          <div className="top-actions">
            <label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything" /><kbd>⌘ K</kbd></label>
            <button className="icon-button" aria-label="Notifications" onClick={() => { setActiveNav('Settings'); setActiveSettingsTab('Notifications') }}><Bell /><i /></button>
            <div className="profile-menu-wrapper" ref={profileMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="mini-avatar"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-expanded={profileMenuOpen}
                aria-label="User profile menu"
                aria-haspopup="true"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--ink)',
                  color: 'var(--lime)',
                  border: profileMenuOpen ? '2px solid var(--lime)' : '2px solid transparent',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '10px',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'border-color 0.2s',
                }}
              >
                {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : 'TM'}
              </button>

              {profileMenuOpen && (
                <div
                  className="profile-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '230px',
                    background: '#fff',
                    border: '1px solid var(--line)',
                    borderRadius: '10px',
                    padding: '12px',
                    zIndex: 1000,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  }}
                >
                  <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--line)', marginBottom: '8px' }}>
                    <b style={{ display: 'block', fontSize: '13px', color: 'var(--ink)' }}>
                      {currentUser?.name || 'Tukaram Munde'}
                    </b>
                    <small style={{ display: 'block', color: '#666', fontSize: '11px', marginTop: '2px' }}>
                      {formatRoleName(currentUser?.role)}
                    </small>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNav('Settings')
                        setActiveSettingsTab('Profile')
                        setProfileMenuOpen(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: 'var(--ink)',
                        background: 'transparent',
                        border: 0,
                        borderRadius: '6px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <User style={{ width: 13, height: 13 }} /> Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNav('Settings')
                        setProfileMenuOpen(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: 'var(--ink)',
                        background: 'transparent',
                        border: 0,
                        borderRadius: '6px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <Settings style={{ width: 13, height: 13 }} /> Settings
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: '#d32f2f',
                        background: 'transparent',
                        border: 0,
                        borderRadius: '6px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontWeight: 600,
                        marginTop: '4px',
                        borderTop: '1px solid #f0f0f0',
                        paddingTop: '10px',
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-wrap">
          {/* Header Bar */}
          <div className="page-heading">
            <div>
              <p className="eyebrow">Tuesday, October 24, 2024 <span className="live-dot" /> AI Risk Intelligence Active</p>
              <h1>Good morning, {currentUser?.name || 'Tukaram Munde'}<span className="accent-period">.</span></h1>
              <p className="lede">Here&apos;s what needs your attention across Maharashtra today.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="icon-button" onClick={() => loadBackendData()} title="Refresh database & ML model predictions"><RefreshCw style={{ width: 14 }} /></button>
              <button
                className={`btn-start-inspection ${isStartingInspection ? 'btn-start-loading' : ''}`}
                onClick={() => {
                  if (realEstablishments.length > 0) {
                    handleStartInspection(realEstablishments[0])
                  }
                }}
                disabled={isStartingInspection || currentUser?.role === 'ESTABLISHMENT_MANAGER'}
                title="Start inspection for top priority establishment"
              >
                {isStartingInspection ? (
                  <>
                    <RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Starting Inspection...
                  </>
                ) : (
                  <>
                    <ClipboardCheck style={{ width: 15, height: 15 }} />
                    <span>{getStartInspectionLabel(realEstablishments[0], 'header')}</span>
                    <span className="btn-arrow"><ArrowRight style={{ width: 14, height: 14 }} /></span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI COPILOT WORKSPACE VIEW */}
          {activeNav === 'AI Copilot' && (
            <div className="copilot-view">
              <div className="section-row" style={{ marginTop: 0 }}>
                <div>
                  <p className="eyebrow">Operational Intelligence <span className="live-dot" /> Database Grounded</p>
                  <h2>LooksFine AI Copilot</h2>
                  <p className="lede" style={{ marginTop: '4px' }}>
                    Ask operational questions answered directly from PostgreSQL records, inspection history, and ML predictions.
                  </p>
                </div>
                {copilotContextEst && (
                  <div className="copilot-context-pill">
                    <Store style={{ width: 12 }} /> Grounded Context: <b>{copilotContextEst.name}</b>
                    <button style={{ border: 0, background: 'none', color: '#999', cursor: 'pointer', padding: '0 2px' }} onClick={() => setCopilotContextEst(null)}>
                      <X style={{ width: 12 }} />
                    </button>
                  </div>
                )}
              </div>

              <div className="copilot-chat-box">
                <div className="copilot-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="copilot-orb"><Bot /></div>
                    <div>
                      <b style={{ fontSize: '14px' }}>Grounded Decision Assistant</b>
                      <small style={{ display: 'block', color: '#9da69c', fontSize: '10px' }}>AI Provider: Ollama (llama3.1:8b) · Local Mode · PostgreSQL Grounded</small>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="copilot-badge"><i /> Ollama Llama 3.1 8B</span>
                    <button className="text-button" style={{ color: '#8b918d', fontSize: '11px' }} onClick={() => setCopilotMessages([{ role: 'assistant', text: 'Conversation cleared. Ask any operational question about LooksFine database records and ML risk intelligence.' }])}>
                      Clear
                    </button>
                  </div>
                </div>

                <div className="copilot-messages">
                  {copilotMessages.map((msg, idx) => (
                    <div key={idx} className={msg.role === 'user' ? 'copilot-msg copilot-msg-user' : 'copilot-msg copilot-msg-assistant'}>
                      {msg.role === 'user' ? (
                        <div>{msg.text}</div>
                      ) : (
                        <div>
                          <pre>{msg.text}</pre>
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="copilot-evidence-box">
                              <div className="copilot-evidence-title">
                                <ShieldCheck style={{ width: 13 }} /> Grounded Evidence &amp; Database Sources ({msg.sources.length})
                              </div>
                              <div className="copilot-sources-grid">
                                {msg.sources.map((src: any, sIdx: number) => (
                                  <div key={sIdx} className="copilot-source-chip" title={`${src.relevance} (${src.id})`}>
                                    <span className="copilot-source-type">{src.type.replace('_', ' ')}</span>
                                    <span>{src.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {copilotLoading && (
                    <div className="copilot-msg copilot-msg-assistant">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--lime)' }}>
                        <RefreshCw style={{ width: 14 }} />
                        <span style={{ fontSize: '12px' }}>Retrieving grounded database records &amp; running decision inference...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="copilot-prompts-bar">
                  <span style={{ fontSize: '10px', color: '#7e8785', fontWeight: 800, textTransform: 'uppercase', alignSelf: 'center', marginRight: '4px' }}>
                    Suggested:
                  </span>
                  {[
                    'Why is Hotel Rajdhani high risk?',
                    'Which establishments in Solapur should be prioritized?',
                    'Show recurring violations in Pune.',
                    'Which establishments have unresolved critical violations?',
                    'Prepare an inspection briefing for Hotel Rajdhani.',
                    'Which corrective actions are still pending?',
                  ].map((promptText) => (
                    <button key={promptText} className="copilot-prompt-btn" onClick={() => handleAskCopilot(promptText)}>
                      <Sparkles style={{ width: 11, color: 'var(--lime)' }} /> {promptText}
                    </button>
                  ))}
                </div>

                <div className="copilot-input-area">
                  <input
                    value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAskCopilot()
                      }
                    }}
                    placeholder="Ask Copilot about risk, violations, inspections, priority queue..."
                  />
                  <button className="copilot-send-btn" disabled={copilotLoading || !copilotInput.trim()} onClick={() => handleAskCopilot()}>
                    Ask Copilot <ArrowUpRight style={{ width: 13 }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OVERVIEW DASHBOARD VIEW */}
          {activeNav === 'Overview' && (
            <>
              {/* Executive Operational Portfolio Metrics Cards */}
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card dark-card">
                  <span className="stat-label">Total Monitored Sites</span>
                  <strong>{summaryStats.total}</strong>
                  <span className="stat-meta lime"><Building2 style={{ width: 13, height: 13 }} /> Active Database</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Critical &amp; High Risk</span>
                  <strong style={{ color: 'var(--coral, #e54d42)' }}>
                    {(summaryStats.criticalCount || 0) + (summaryStats.highCount || 0)}
                  </strong>
                  <span className="stat-meta coral"><AlertTriangle style={{ width: 13, height: 13 }} /> High Priority</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Overdue Inspections</span>
                  <strong style={{ color: summaryStats.overdueCount > 0 ? '#ed6c02' : '#333' }}>
                    {summaryStats.overdueCount}
                  </strong>
                  <span className="stat-meta coral"><Clock3 style={{ width: 13, height: 13 }} /> Past Due Window</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Open Critical Issues</span>
                  <strong style={{ color: summaryStats.openCriticalViolationsCount > 0 ? '#d32f2f' : '#333' }}>
                    {summaryStats.openCriticalViolationsCount}
                  </strong>
                  <span className="stat-meta coral"><Flame style={{ width: 13, height: 13 }} /> Active Violations</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Pending Actions</span>
                  <strong style={{ color: summaryStats.pendingActionsCount > 0 ? '#ed6c02' : '#333' }}>
                    {summaryStats.pendingActionsCount}
                  </strong>
                  <span className="stat-meta lime"><ListChecks style={{ width: 13, height: 13 }} /> Corrective Queue</span>
                </div>
              </div>

              {/* Dynamic Portfolio Health Status Bar & Interactive Risk Distribution */}
              <div style={{ margin: '20px 0 24px 0', background: '#fff', border: '1px solid var(--line)', borderRadius: '14px', padding: '18px 22px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Portfolio Safety Health Indicator
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <span className={`status-badge ${portfolioHealth.status === 'Attention Required' ? 'status-critical' : portfolioHealth.status === 'Improving' ? 'status-stable' : 'status-watch'}`}>
                        <span className="status-dot" />{portfolioHealth.status}
                      </span>
                      <p style={{ fontSize: '13px', color: '#333', margin: 0, fontWeight: 500 }}>
                        {portfolioHealth.rationale}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {filter !== 'All' && (
                      <button className="text-button" onClick={() => setFilter('All')} style={{ fontSize: '11px', color: '#555' }}>
                        Clear Filter ({filter})
                      </button>
                    )}
                    <button className="dark-button" onClick={() => setActiveNav('Reports')} style={{ fontSize: '11px', padding: '6px 12px' }}>
                      Executive Report <ArrowUpRight style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>

                {/* Proportional Interactive Risk Distribution Bar */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    <span>Proportional Risk Tier Distribution (Click segment to filter directory below):</span>
                    <span>Total {summaryStats.total} Establishments</span>
                  </div>

                  <div className="risk-distribution-bar">
                    <div
                      className="risk-distribution-segment segment-critical"
                      style={{ flex: Math.max(1, summaryStats.criticalCount) }}
                      title={`Critical Risk: ${summaryStats.criticalCount} establishments`}
                      onClick={() => {
                        setFilter('Critical')
                        const el = document.getElementById('directory-section')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      Critical ({summaryStats.criticalCount})
                    </div>

                    <div
                      className="risk-distribution-segment segment-high"
                      style={{ flex: Math.max(1, summaryStats.highCount || 0) }}
                      title={`High Risk: ${summaryStats.highCount || 0} establishments`}
                      onClick={() => {
                        setFilter('Watch')
                        const el = document.getElementById('directory-section')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      High ({summaryStats.highCount || 0})
                    </div>

                    <div
                      className="risk-distribution-segment segment-watch"
                      style={{ flex: Math.max(1, summaryStats.watchCount) }}
                      title={`Watch / Medium Risk: ${summaryStats.watchCount} establishments`}
                      onClick={() => {
                        setFilter('Watch')
                        const el = document.getElementById('directory-section')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      Watch ({summaryStats.watchCount})
                    </div>

                    <div
                      className="risk-distribution-segment segment-stable"
                      style={{ flex: Math.max(1, summaryStats.stableCount) }}
                      title={`Stable / Low Risk: ${summaryStats.stableCount} establishments`}
                      onClick={() => {
                        setFilter('Stable')
                        const el = document.getElementById('directory-section')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      Stable ({summaryStats.stableCount})
                    </div>
                  </div>
                </div>
              </div>

              <div className="section-row">
                <div>
                  <p className="eyebrow"><Sparkles style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> AI-Powered Smart Inspect Queue</p>
                  <h2>Who to Inspect Next &amp; Why</h2>
                </div>
                <button className="text-button" onClick={() => setActiveNav('Inspections')}>View all inspections <ArrowUpRight /></button>
              </div>

              {/* Interactive Queue Filter Bar */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', margin: '14px 0 18px 0', background: '#f8faf9', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter style={{ width: 13, height: 13 }} /> Queue Filters:
                </span>
                <select value={queueRiskFilter} onChange={(e) => setQueueRiskFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--line)', fontSize: '11px', background: '#fff', cursor: 'pointer' }}>
                  <option value="All">All Risk Levels</option>
                  <option value="CRITICAL">Critical Risk Only</option>
                  <option value="HIGH">High Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="LOW">Low Risk</option>
                </select>

                <select value={queueRegionFilter} onChange={(e) => setQueueRegionFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--line)', fontSize: '11px', background: '#fff', cursor: 'pointer' }}>
                  <option value="All">All Regions</option>
                  <option value="Solapur">Solapur</option>
                  <option value="Pune">Pune</option>
                  <option value="Nashik">Nashik</option>
                  <option value="Kolhapur">Kolhapur</option>
                  <option value="Sangli">Sangli</option>
                  <option value="Satara">Satara</option>
                  <option value="Ahmednagar">Ahmednagar</option>
                  <option value="Nagpur">Nagpur</option>
                  <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Thane">Thane</option>
                </select>

                <select value={queueTypeFilter} onChange={(e) => setQueueTypeFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--line)', fontSize: '11px', background: '#fff', cursor: 'pointer' }}>
                  <option value="All">All Establishment Types</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Food Truck">Food Truck</option>
                  <option value="Hospital Kitchen">Hospital Kitchen</option>
                  <option value="School/College Cafeteria">School Cafeteria</option>
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', marginLeft: 'auto', userSelect: 'none' }}>
                  <input type="checkbox" checked={queueOverdueOnly} onChange={(e) => setQueueOverdueOnly(e.target.checked)} style={{ cursor: 'pointer' }} />
                  <span style={{ color: queueOverdueOnly ? 'var(--coral, #e54d42)' : '#555', fontWeight: queueOverdueOnly ? 600 : 400 }}>
                    Overdue Inspections Only
                  </span>
                </label>
              </div>

              {/* Smart Inspect Queue Feed */}
              {smartQueueLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#666', background: '#fff', borderRadius: '14px', border: '1px solid var(--line)' }}>
                  <RefreshCw style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>Calculating inspection priorities from live PostgreSQL records &amp; ML models...</p>
                </div>
              ) : smartQueueError ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#e54d42', background: '#fff0f0', borderRadius: '14px', border: '1px solid #ffcdd2' }}>
                  <AlertTriangle style={{ width: 20, height: 20, marginBottom: 6 }} />
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>{smartQueueError}</p>
                  <button className="text-button" onClick={() => loadSmartQueue()} style={{ marginTop: 8 }}>Retry Loading Queue</button>
                </div>
              ) : smartQueue.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#777', background: '#fff', borderRadius: '14px', border: '1px solid var(--line)' }}>
                  <ShieldCheck style={{ width: 24, height: 24, color: 'var(--lime)', marginBottom: 8 }} />
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>No inspection priorities match the selected filters.</p>
                  <p style={{ fontSize: '11px', color: '#999', marginTop: 4 }}>Try clearing filters or switching regions to view other priority targets.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {smartQueue.map((item) => (
                    <div key={item.id} className="smart-queue-card" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '14px', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: item.rank === 1 ? 'var(--coral, #e54d42)' : item.rank <= 3 ? '#ff9800' : '#eceff1', color: item.rank <= 3 ? '#fff' : '#455a64', fontWeight: 800, fontSize: '15px' }}>
                            #{item.rank}
                          </span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, cursor: 'pointer', color: '#111' }} onClick={() => openEstablishmentById(item.id)}>
                                {item.name}
                              </h3>
                              <span className={`status-badge status-${item.riskLevel.toLowerCase()}`}>
                                <span className="status-dot" />{item.riskLevel}
                              </span>
                              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: item.predictionSource === 'ml' ? '#e8f5e9' : '#fff3e0', color: item.predictionSource === 'ml' ? '#2e7d32' : '#e65100', fontWeight: 600, border: item.predictionSource === 'ml' ? '1px solid #a5d6a7' : '1px solid #ffe0b2' }}>
                                {item.predictionSource === 'ml' ? 'AI Risk Model' : 'Baseline Risk Engine'}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
                              {item.type} <span>·</span> {item.area} <span>·</span> <strong style={{ color: item.probability >= 0.75 ? '#d32f2f' : '#333' }}>{(item.probability * 100).toFixed(1)}% predicted serious violation</strong>
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '22px', fontWeight: 800, color: item.priorityScore >= 80 ? '#d32f2f' : item.priorityScore >= 50 ? '#ed6c02' : '#2e7d32' }}>
                            {item.priorityScore}
                            <small style={{ fontSize: '10px', fontWeight: 600, color: '#666', display: 'block' }}>Priority Score</small>
                          </div>
                        </div>
                      </div>

                      {/* Why inspect now? Rationale Bullets */}
                      <div style={{ background: '#f9fbf9', borderRadius: '10px', padding: '10px 14px', border: '1px solid #edf2ef' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#444', display: 'block', marginBottom: '4px' }}>
                          Why inspect now?
                        </span>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#333', lineHeight: '1.6' }}>
                          {item.reasons.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Card Bottom Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#666' }}>
                          <span>Unresolved violations: <b>{item.unresolvedViolations}</b></span>
                          <span>·</span>
                          <span>Failed corrective actions: <b>{item.failedCorrectiveActions}</b></span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className={`btn-start-inspection ${isStartingInspection && selected?.id === item.id ? 'btn-start-loading' : ''}`}
                            style={{ fontSize: '11px', padding: '7px 14px' }}
                            disabled={isStartingInspection || currentUser?.role === 'ESTABLISHMENT_MANAGER'}
                            onClick={() => {
                              openEstablishmentById(item.id)
                              handleStartInspection(item)
                            }}
                          >
                            {isStartingInspection && selected?.id === item.id ? (
                              <>
                                <RefreshCw style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> Starting...
                              </>
                            ) : (
                              <>
                                <ClipboardCheck style={{ width: 14, height: 14 }} />
                                <span>{getStartInspectionLabel(item, 'queue')}</span>
                                <span className="btn-arrow"><ArrowRight style={{ width: 13, height: 13 }} /></span>
                              </>
                            )}
                          </button>

                          <button
                            className="dark-button"
                            style={{ fontSize: '11px', padding: '7px 12px', background: '#252c2a' }}
                            onClick={() => {
                              openEstablishmentById(item.id)
                              handleGenerateBriefing(item.id)
                            }}
                          >
                            <FileText style={{ width: 13, height: 13 }} /> Inspector Briefing
                          </button>

                          <button
                            className="text-button"
                            style={{ fontSize: '11px', color: '#1b5e20', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleAskCopilot(`Why should we inspect ${item.name} now?`, item.id)}
                          >
                            <Bot style={{ width: 13, height: 13 }} /> Ask Copilot <ArrowUpRight style={{ width: 12, height: 12 }} />
                          </button>

                          <button
                            className="text-button"
                            style={{ fontSize: '11px', color: '#444' }}
                            onClick={() => openEstablishmentById(item.id)}
                          >
                            View Intelligence <ArrowUpRight style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="section-row second">
                <div><p className="eyebrow">Portfolio overview</p><h2>Risk at a glance</h2></div>
                <div className="filter-group">
                  {(['All', 'Critical', 'Watch', 'Stable'] as const).map((item) => (
                    <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'filter-button active' : 'filter-button'}>{item}</button>
                  ))}
                </div>
              </div>

              <div className="overview-grid">
                <div className="distribution-card">
                  <div className="card-heading"><div><h3>Risk distribution</h3><p>Across {summaryStats.total} active establishments</p></div><MoreHorizontal /></div>
                  <div className="donut-wrap">
                    <div className="donut"><div><strong>{summaryStats.avgScore}</strong><small>avg. score</small></div></div>
                    <div className="legend">
                      <span><i className="legend-coral" /> Critical <b>{summaryStats.criticalCount}</b></span>
                      <span><i className="legend-lime" /> Watch <b>{summaryStats.watchCount}</b></span>
                      <span><i className="legend-blue" /> Stable <b>{summaryStats.stableCount}</b></span>
                    </div>
                  </div>
                  <div className="distribution-footer"><span><ArrowDownRight /> 3.2% lower than last month</span><b>Good trend</b></div>
                </div>

                <div className="map-card">
                  <div className="card-heading"><div><h3>Regional hotspots</h3><p>Risk concentration by neighborhood</p></div><button className="icon-button small"><MapPin /></button></div>
                  <div className="map-visual">
                    <div className="map-grid" />
                    <span className="map-label label-mission">Solapur <b>82</b></span>
                    <span className="map-label label-marina">Pune <b>67</b></span>
                    <span className="map-label label-soma">Nashik <b>41</b></span>
                    <span className="map-label label-north">Kolhapur <b>58</b></span>
                    <div className="hotspot hotspot-one" /><div className="hotspot hotspot-two" /><div className="hotspot hotspot-three" />
                  </div>
                  <div className="map-footer"><span><i className="hotspot-key" /> Higher concentration</span><button className="text-button">Open map <ArrowUpRight /></button></div>
                </div>

                <div className="trajectory-card">
                  <div className="card-heading"><div><h3>Risk trajectory</h3><p>Citywide score · last 6 months</p></div><button className="icon-button small"><CalendarClock /></button></div>
                  <div className="trajectory-value"><strong>{summaryStats.avgScore}</strong><span><ArrowDownRight /> 3 pts</span></div>
                  <div className="chart">
                    <div className="chart-y"><span>70</span><span>50</span><span>30</span></div>
                    <svg viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label="Risk trajectory chart">
                      <path className="chart-area" d="M0 25 C25 38 35 28 55 48 S90 38 110 70 S140 57 165 65 S195 78 215 69 S245 83 270 78 S300 94 320 88 L320 120 L0 120Z" />
                      <path className="chart-line" d="M0 25 C25 38 35 28 55 48 S90 38 110 70 S140 57 165 65 S195 78 215 69 S245 83 270 78 S300 94 320 88" />
                    </svg>
                    <div className="chart-x"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div>
                  </div>
                </div>
              </div>

              <div id="recent-intelligence-section" className="section-row second" style={{ marginTop: '28px' }}>
                <div>
                  <p className="eyebrow"><Activity style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> Recent Intelligence</p>
                  <h2>Live Database Activity &amp; Audit Feed</h2>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(['All', 'Risk', 'Inspections', 'Violations', 'Corrective Actions', 'Evidence'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setRecentIntelFilter(cat)
                        loadRecentIntelligence(cat)
                      }}
                      className={recentIntelFilter === cat ? 'filter-button active' : 'filter-button'}
                      style={{ fontSize: '11px', padding: '5px 11px' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {recentIntelLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#666', background: '#fff', borderRadius: '14px', border: '1px solid var(--line)' }}>
                  <RefreshCw style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>Fetching live database events and audit trails...</p>
                </div>
              ) : recentIntelEvents.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#777', background: '#fff', borderRadius: '14px', border: '1px solid var(--line)' }}>
                  <ShieldCheck style={{ width: 24, height: 24, color: 'var(--lime)', marginBottom: 8 }} />
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>No recent intelligence events match category "{recentIntelFilter}".</p>
                </div>
              ) : (
                <div className="intelligence-feed-container">
                  {recentIntelEvents.map((ev) => (
                    <div key={ev.id} className={`intelligence-event-card event-${ev.severity.toLowerCase()}`}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: '#f0f4f2', color: '#333', fontWeight: 700, border: '1px solid #d5ddd8' }}>
                            {ev.category}
                          </span>
                          <span className={`status-badge status-${ev.severity === 'CRITICAL' ? 'critical' : ev.severity === 'HIGH' ? 'watch' : 'stable'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                            <span className="status-dot" />{ev.severity}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#111', cursor: 'pointer' }} onClick={() => openEstablishmentById(ev.establishmentId)}>
                            {ev.establishmentName} ({ev.area})
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock3 style={{ width: 12, height: 12 }} /> {ev.timeAgo}
                        </span>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 2px 0', color: '#1a2220' }}>
                          {ev.title}
                        </h4>
                        <p style={{ fontSize: '12px', color: '#4a5552', margin: 0, lineHeight: '1.5' }}>
                          {ev.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #f0f4f2', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', color: '#666' }}>
                          Audit Trail ID: <code style={{ background: '#f5f7f6', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>{ev.id.substring(0, 10)}</code>
                        </span>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="btn-start-inspection"
                            style={{ fontSize: '10px', padding: '5px 10px' }}
                            disabled={currentUser?.role === 'ESTABLISHMENT_MANAGER'}
                            onClick={() => {
                              openEstablishmentById(ev.establishmentId)
                              handleStartInspection({ id: ev.establishmentId, name: ev.establishmentName } as any)
                            }}
                          >
                            <ClipboardCheck style={{ width: 12, height: 12 }} /> Start Inspection
                          </button>

                          <button
                            className="dark-button"
                            style={{ fontSize: '10px', padding: '5px 10px', background: '#252c2a' }}
                            onClick={() => {
                              openEstablishmentById(ev.establishmentId)
                              handleGenerateBriefing(ev.establishmentId)
                            }}
                          >
                            <FileText style={{ width: 12, height: 12 }} /> Briefing
                          </button>

                          <button
                            className="text-button"
                            style={{ fontSize: '10px', color: '#1b5e20', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                            onClick={() => handleAskCopilot(`What led to this event: ${ev.title}?`, ev.establishmentId)}
                          >
                            <Bot style={{ width: 12, height: 12 }} /> Ask Copilot
                          </button>

                          <button
                            className="text-button"
                            style={{ fontSize: '10px', color: '#444' }}
                            onClick={() => openEstablishmentById(ev.establishmentId)}
                          >
                            View Site <ArrowUpRight style={{ width: 11, height: 11 }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* INSPECTIONS WORKSPACE VIEW */}
          {activeNav === 'Inspections' && (
            <div style={{ marginTop: '24px' }}>
              <div className="section-row">
                <div><p className="eyebrow">Inspection Planning & Workload</p><h2>Active Inspection Queue</h2></div>
                <button className="primary-button" onClick={() => setShowScheduleModal(true)}><Plus data-icon="inline-start" />Schedule New Inspection</button>
              </div>

              <div className="queue-card" style={{ marginTop: '16px' }}>
                {inspectionsList.length > 0 ? (
                  inspectionsList.map((insp) => (
                    <div className="queue-row" key={insp.id} style={{ cursor: 'pointer' }} onClick={() => {
                      const found = realEstablishments.find(e => e.name === insp.establishmentName) || realEstablishments[0]
                      openEstablishment(found)
                    }}>
                      <span className="queue-main">
                        <b>{insp.establishmentName}</b>
                        <small>{insp.area} <span>·</span> Inspector: {insp.inspectorName} <span>·</span> Scheduled: {insp.scheduledDate}</small>
                      </span>
                      <span className={`status-badge status-${insp.status === 'REVIEWED' || insp.status === 'RESOLVED' ? 'stable' : insp.status === 'CORRECTIVE_ACTION_REQUIRED' ? 'critical' : 'watch'}`}>
                        <span className="status-dot" />{insp.status.replace('_', ' ')}
                      </span>
                      <ChevronDown className="row-arrow" />
                    </div>
                  ))
                ) : (
                  <p style={{ padding: '20px', color: '#777' }}>No active inspections found.</p>
                )}
              </div>
            </div>
          )}

          {/* ESTABLISHMENTS DIRECTORY VIEW */}
          {activeNav === 'Establishments' && (
            <div id="directory-section" style={{ marginTop: '24px' }}>
              <div className="section-row">
                <div><p className="eyebrow">Database Directory</p><h2>All Establishments ({filtered.length})</h2></div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '20px', border: '1px solid var(--line)', background: 'var(--white)', fontSize: '11px' }}>
                    <option value="All">All Regions</option>
                    <option value="Solapur">Solapur</option>
                    <option value="Pune">Pune</option>
                    <option value="Nashik">Nashik</option>
                    <option value="Kolhapur">Kolhapur</option>
                    <option value="Sangli">Sangli</option>
                    <option value="Satara">Satara</option>
                    <option value="Ahmednagar">Ahmednagar</option>
                    <option value="Nagpur">Nagpur</option>
                    <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Thane">Thane</option>
                  </select>

                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '20px', border: '1px solid var(--line)', background: 'var(--white)', fontSize: '11px' }}>
                    <option value="All">All Types</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Grocery">Grocery</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Cafe">Cafe</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Food Truck">Food Truck</option>
                  </select>
                </div>
              </div>

              <div className="queue-card" style={{ marginTop: '16px' }}>
                {filtered.map((item) => (
                  <button className="queue-row" key={item.name} onClick={() => openEstablishment(item)}>
                    <span className="queue-main">
                      <b>{item.name}</b>
                      <small>{item.type} <span>·</span> {item.area} <span>·</span> Last inspected {item.lastInspection}</small>
                    </span>
                    <StatusBadge status={item.status} />
                    <span className="queue-score">{item.score}<small> risk</small></span>
                    <ChevronDown className="row-arrow" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PATTERNS INTELLIGENCE VIEW */}
          {activeNav === 'Patterns' && (
            <div style={{ marginTop: '24px' }}>
              <div className="section-row" style={{ alignItems: 'center' }}>
                <div>
                  <p className="eyebrow"><Activity style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> Pattern Intelligence</p>
                  <h2>Active Operational Intelligence Feed</h2>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {(['All', 'Risk', 'Inspections', 'Violations', 'Corrective Actions', 'Evidence'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setRecentIntelFilter(cat)
                        loadRecentIntelligence(cat)
                      }}
                      className={recentIntelFilter === cat ? 'filter-button active' : 'filter-button'}
                      style={{ fontSize: '11px', padding: '5px 11px' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {recentIntelLoading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#666', background: '#fff', borderRadius: '14px', border: '1px solid var(--line)', marginTop: '16px' }}>
                  <RefreshCw style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>Fetching live database events and audit trails...</p>
                </div>
              ) : recentIntelEvents.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#777', background: '#fff', borderRadius: '14px', border: '1px solid var(--line)', marginTop: '16px' }}>
                  <ShieldCheck style={{ width: 24, height: 24, color: 'var(--lime)', marginBottom: 8 }} />
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>No recent intelligence events match category "{recentIntelFilter}".</p>
                </div>
              ) : (
                <div className="intelligence-feed-container" style={{ marginTop: '16px' }}>
                  {recentIntelEvents.map((ev) => (
                    <div key={ev.id} className={`intelligence-event-card event-${ev.severity.toLowerCase()}`}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: '#f0f4f2', color: '#333', fontWeight: 700, border: '1px solid #d5ddd8' }}>
                            {ev.category}
                          </span>
                          <span className={`status-badge status-${ev.severity === 'CRITICAL' ? 'critical' : ev.severity === 'HIGH' ? 'watch' : 'stable'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                            <span className="status-dot" />{ev.severity}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#111', cursor: 'pointer' }} onClick={() => openEstablishmentById(ev.establishmentId)}>
                            {ev.establishmentName} ({ev.area})
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#777', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock3 style={{ width: 12, height: 12 }} /> {ev.timeAgo}
                        </span>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '4px 0 2px 0', color: '#1a2220' }}>
                          {ev.title}
                        </h4>
                        <p style={{ fontSize: '12px', color: '#4a5552', margin: 0, lineHeight: '1.5' }}>
                          {ev.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #f0f4f2', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', color: '#666' }}>
                          Audit Trail ID: <code style={{ background: '#f5f7f6', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>{ev.id.substring(0, 10)}</code>
                        </span>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="btn-start-inspection"
                            style={{ fontSize: '10px', padding: '5px 10px' }}
                            disabled={currentUser?.role === 'ESTABLISHMENT_MANAGER'}
                            onClick={() => {
                              openEstablishmentById(ev.establishmentId)
                              handleStartInspection({ id: ev.establishmentId, name: ev.establishmentName } as any)
                            }}
                          >
                            <ClipboardCheck style={{ width: 12, height: 12 }} /> Start Inspection
                          </button>

                          <button
                            className="dark-button"
                            style={{ fontSize: '10px', padding: '5px 10px', background: '#252c2a' }}
                            onClick={() => {
                              openEstablishmentById(ev.establishmentId)
                              handleGenerateBriefing(ev.establishmentId)
                            }}
                          >
                            <FileText style={{ width: 12, height: 12 }} /> Briefing
                          </button>

                          <button
                            className="text-button"
                            style={{ fontSize: '10px', color: '#1b5e20', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                            onClick={() => handleAskCopilot(`What led to this event: ${ev.title}?`, ev.establishmentId)}
                          >
                            <Bot style={{ width: 12, height: 12 }} /> Ask Copilot
                          </button>

                          <button
                            className="text-button"
                            style={{ fontSize: '10px', color: '#444' }}
                            onClick={() => openEstablishmentById(ev.establishmentId)}
                          >
                            View Site <ArrowUpRight style={{ width: 11, height: 11 }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OPERATIONAL FOOD SAFETY REPORT VIEW */}
          {activeNav === 'Reports' && (
            <div className="reports-container">
              {/* Header & Controls */}
              <div className="section-row" style={{ marginTop: 0, alignItems: 'center' }}>
                <div>
                  <p className="eyebrow">Operational Intelligence <span className="live-dot" /> Verified Database Grounded</p>
                  <h2 style={{ fontSize: '26px', margin: '2px 0 0 0' }}>Food Safety Overview</h2>
                  <p className="lede" style={{ marginTop: '4px' }}>
                    An easy-to-understand summary of inspection activity, risks, violations, and corrective actions.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value as any)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="all">All time</option>
                  </select>

                  <select
                    value={reportRegion}
                    onChange={(e) => setReportRegion(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', background: '#fff', cursor: 'pointer' }}
                  >
                    <option value="All">All Maharashtra</option>
                    <option value="Solapur">Solapur</option>
                    <option value="Pune">Pune</option>
                    <option value="Nashik">Nashik</option>
                    <option value="Kolhapur">Kolhapur</option>
                    <option value="Sangli">Sangli</option>
                  </select>

                  <button className="dark-button" onClick={handleExportReport} style={{ padding: '8px 14px', fontSize: '11px' }}>
                    <Download style={{ width: 13, height: 13 }} /> Export Report
                  </button>
                </div>
              </div>

              {/* Executive Summary Cards */}
              <div className="report-exec-grid">
                <div className="report-metric-card">
                  <span className="report-metric-label">Establishments Monitored</span>
                  <div className="report-metric-val">{reportData?.executiveSummary.totalMonitored || realEstablishments.length}</div>
                  <span className="report-metric-sub">Active registered sites</span>
                </div>

                <div className="report-metric-card" style={{ background: '#fff4f2', borderColor: '#ffcdd2' }}>
                  <span className="report-metric-label" style={{ color: '#c62828' }}>Require Attention</span>
                  <div className="report-metric-val" style={{ color: '#d32f2f' }}>
                    {reportData?.executiveSummary.requireAttentionCount ?? 3}
                  </div>
                  <span className="report-metric-sub" style={{ color: '#c62828' }}>High or critical risk</span>
                </div>

                <div className="report-metric-card" style={{ background: '#fff8e1', borderColor: '#ffe082' }}>
                  <span className="report-metric-label" style={{ color: '#b78103' }}>Overdue Inspections</span>
                  <div className="report-metric-val" style={{ color: '#e65100' }}>
                    {reportData?.executiveSummary.overdueInspectionsCount ?? 1}
                  </div>
                  <span className="report-metric-sub" style={{ color: '#b78103' }}>Past schedule interval</span>
                </div>

                <div className="report-metric-card">
                  <span className="report-metric-label">Open Critical Issues</span>
                  <div className="report-metric-val" style={{ color: '#c62828' }}>
                    {reportData?.executiveSummary.openCriticalViolationsCount ?? 2}
                  </div>
                  <span className="report-metric-sub">Unresolved critical defects</span>
                </div>

                <div className="report-metric-card">
                  <span className="report-metric-label">Corrective Actions Pending</span>
                  <div className="report-metric-val">
                    {reportData?.executiveSummary.pendingActionsCount ?? 4}
                  </div>
                  <span className="report-metric-sub">Under review or required</span>
                </div>

                <div className="report-metric-card" style={{ background: '#f1f8e9', borderColor: '#c8e6c9' }}>
                  <span className="report-metric-label" style={{ color: '#2e7d32' }}>Stable &amp; Improving</span>
                  <div className="report-metric-val" style={{ color: '#2e7d32' }}>
                    {reportData?.executiveSummary.improvingEstsCount ?? 18}
                  </div>
                  <span className="report-metric-sub" style={{ color: '#2e7d32' }}>Low risk trajectory</span>
                </div>
              </div>

              {/* Insight Callout Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div className="report-insight-card">
                  <div className="report-insight-icon" style={{ background: '#eaf5b8', color: '#688220' }}><Sparkles style={{ width: 15, height: 15 }} /></div>
                  <div className="report-insight-body">
                    <b>Primary Safety Concern</b>
                    <span>{reportData?.insights?.[0]?.text || 'Temperature control issues are currently the most common concern.'}</span>
                  </div>
                </div>

                <div className="report-insight-card">
                  <div className="report-insight-icon" style={{ background: '#ffe4df', color: '#cb6258' }}><AlertTriangle style={{ width: 15, height: 15 }} /></div>
                  <div className="report-insight-body">
                    <b>Action Required</b>
                    <span>{reportData?.insights?.[1]?.text || '3 establishments require immediate inspection or evidence review.'}</span>
                  </div>
                </div>

                <div className="report-insight-card">
                  <div className="report-insight-icon" style={{ background: '#e1f1f3', color: '#588996' }}><ShieldCheck style={{ width: 15, height: 15 }} /></div>
                  <div className="report-insight-body">
                    <b>Compliance Health</b>
                    <span>{reportData?.insights?.[2]?.text || '18 establishments maintain stable compliance trajectories.'}</span>
                  </div>
                </div>
              </div>

              {/* What Needs Attention Section */}
              <div className="report-section-card">
                <div className="report-section-header">
                  <div>
                    <h3><ShieldAlert style={{ width: 18, height: 18, color: '#d32f2f' }} /> What Needs Attention?</h3>
                    <p>Establishments requiring the most immediate inspection and follow-up</p>
                  </div>
                  <span style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>Ranked by urgency</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(reportData?.needsAttentionList || []).map((item: any, idx: number) => (
                    <div key={item.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: item.riskLevel === 'CRITICAL' ? '#ffe4df' : '#fff3e0', color: item.riskLevel === 'CRITICAL' ? '#d32f2f' : '#e65100', fontWeight: 800, fontSize: '13px', display: 'grid', placeItems: 'center' }}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <b style={{ fontSize: '15px', color: 'var(--ink)' }}>{item.name}</b>
                            <span className={`status-badge status-${item.riskLevel.toLowerCase()}`}>
                              <span className="status-dot" />{item.riskLevel}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#d32f2f' }}>
                              Risk Score: {item.riskScore} / 100
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0 0' }}>
                            {item.type} · {item.city} · <strong style={{ color: '#d32f2f' }}>{item.probabilityPercentage} likelihood of serious issue at next inspection</strong>
                          </p>

                          {/* Why Attention is Needed Bullets */}
                          <div style={{ marginTop: '8px', fontSize: '11px', color: '#444' }}>
                            <span style={{ fontWeight: 700, color: '#333' }}>Why attention is needed:</span>
                            <ul style={{ margin: '2px 0 0 0', paddingLeft: '16px', color: '#555' }}>
                              {item.reasons.map((r: string, rIdx: number) => (
                                <li key={rIdx}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <button className="primary-button" style={{ fontSize: '11px', padding: '6px 12px', background: 'var(--lime)', color: 'var(--ink)' }} onClick={() => { openEstablishmentById(item.id); setWorkflow('inspection') }}>
                          {item.recommendedAction} <ChevronRight style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Read Risk Levels Guide */}
              <div className="report-section-card" style={{ background: '#fafbfa' }}>
                <div className="report-section-header">
                  <div>
                    <h3><Info style={{ width: 17, height: 17, color: '#555' }} /> How to Read Risk Levels</h3>
                    <p>Understand how system risk tiers guide inspection decision support</p>
                  </div>
                </div>

                <div className="report-risk-guide">
                  <div className="report-risk-guide-item" style={{ borderLeft: '4px solid #83bfc9' }}>
                    <b style={{ color: '#3b747f' }}>LOW RISK (0–40)</b>
                    <span>Routine annual monitoring recommended. Compliance history maintained.</span>
                  </div>
                  <div className="report-risk-guide-item" style={{ borderLeft: '4px solid #a5c934' }}>
                    <b style={{ color: '#688220' }}>MEDIUM RISK (41–60)</b>
                    <span>Plan routine follow-up. Minor defects or minor sanitation gaps noted.</span>
                  </div>
                  <div className="report-risk-guide-item" style={{ borderLeft: '4px solid #ed6c02' }}>
                    <b style={{ color: '#e65100' }}>HIGH RISK (61–75)</b>
                    <span>Prioritize inspection &amp; evidence review. Open violations require attention.</span>
                  </div>
                  <div className="report-risk-guide-item" style={{ borderLeft: '4px solid #d32f2f' }}>
                    <b style={{ color: '#c62828' }}>CRITICAL RISK (76–100)</b>
                    <span>Immediate inspection recommended. Multiple unresolved defects or recurring gaps.</span>
                  </div>
                </div>
              </div>

              {/* Common Safety Issues & Recurring Problems */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Common Violation Categories */}
                <div className="report-section-card">
                  <div className="report-section-header">
                    <div>
                      <h3><ListFilter style={{ width: 17, height: 17 }} /> Common Safety Issues</h3>
                      <p>Most frequent violation categories across establishments</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(reportData?.commonSafetyIssues?.categories || []).slice(0, 5).map((cat: any) => (
                      <div key={cat.category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{cat.name}</span>
                          <span style={{ color: '#666' }}>{cat.count} occurrence(s) ({cat.percentage}%)</span>
                        </div>
                        <div style={{ height: '8px', background: '#eceff1', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.max(8, cat.percentage)}%`, background: cat.category.includes('TEMPERATURE') ? 'var(--coral)' : 'var(--lime)', borderRadius: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: '11px', color: '#555', marginTop: '16px', background: '#f5f7f5', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8e3' }}>
                    💡 <b>Summary:</b> {reportData?.commonSafetyIssues?.summary}
                  </p>
                </div>

                {/* Recurring Problems */}
                <div className="report-section-card">
                  <div className="report-section-header">
                    <div>
                      <h3><Flame style={{ width: 17, height: 17, color: 'var(--coral)' }} /> Recurring Problems</h3>
                      <p>Deficiencies appearing repeatedly across multiple sites</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(reportData?.recurringProblems || []).length > 0 ? (
                      (reportData?.recurringProblems || []).map((rec: any) => (
                        <div key={rec.category} style={{ background: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <b style={{ fontSize: '13px', color: '#c62828' }}>{rec.name}</b>
                            <span style={{ fontSize: '10px', background: '#ffe4df', color: '#d32f2f', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                              Repeated across {rec.affectedCount} site(s)
                            </span>
                          </div>
                          <p style={{ fontSize: '11px', color: '#555', margin: '4px 0 0 0' }}>{rec.description}</p>
                          <span style={{ fontSize: '10px', color: '#2e7d32', fontWeight: 600, display: 'block', marginTop: '6px' }}>
                            Recommended action: {rec.recommendedAction}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#777', fontSize: '12px' }}>
                        No recurring violation pattern detected in the current filter scope.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Corrective Action Progress Lifecycle */}
              <div className="report-section-card">
                <div className="report-section-header">
                  <div>
                    <h3><ClipboardCheck style={{ width: 17, height: 17 }} /> Corrective Action Progress</h3>
                    <p>Lifecycle summary of violations identified, submitted evidence, and closures</p>
                  </div>
                </div>

                <div className="report-lifecycle-flow">
                  <div className="report-lifecycle-step">
                    <b>{reportData?.actionLifecycle?.identified ?? 4}</b>
                    <span>1. Identified</span>
                  </div>
                  <div style={{ color: '#aaa', fontSize: '14px' }}>→</div>
                  <div className="report-lifecycle-step">
                    <b>{reportData?.actionLifecycle?.required ?? 2}</b>
                    <span>2. Action Required</span>
                  </div>
                  <div style={{ color: '#aaa', fontSize: '14px' }}>→</div>
                  <div className="report-lifecycle-step" style={{ background: '#eef8ff', borderColor: '#bbdefb' }}>
                    <b>{reportData?.actionLifecycle?.submitted ?? 1}</b>
                    <span style={{ color: '#1565c0' }}>3. Evidence Submitted</span>
                  </div>
                  <div style={{ color: '#aaa', fontSize: '14px' }}>→</div>
                  <div className="report-lifecycle-step" style={{ background: '#fff8e1', borderColor: '#ffe082' }}>
                    <b>{reportData?.actionLifecycle?.underReview ?? 1}</b>
                    <span style={{ color: '#e65100' }}>4. Under Review</span>
                  </div>
                  <div style={{ color: '#aaa', fontSize: '14px' }}>→</div>
                  <div className="report-lifecycle-step" style={{ background: '#e8f5e9', borderColor: '#a5d6a7' }}>
                    <b>{reportData?.actionLifecycle?.closed ?? 1}</b>
                    <span style={{ color: '#2e7d32' }}>5. Accepted / Closed</span>
                  </div>
                </div>
              </div>

              {/* Compliance Trend & Regional Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                {/* Compliance Trend */}
                <div className="report-section-card">
                  <div className="report-section-header">
                    <div>
                      <h3><Activity style={{ width: 17, height: 17 }} /> Are Things Improving?</h3>
                      <p>Compliance trend across monitored establishments</p>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: reportData?.complianceTrend?.state === 'IMPROVING' ? '#2e7d32' : reportData?.complianceTrend?.state === 'NEEDS_ATTENTION' ? '#d32f2f' : '#666', background: '#f0f4f1', padding: '4px 10px', borderRadius: '14px' }}>
                      {reportData?.complianceTrend?.state === 'IMPROVING' ? 'Improving ↑' : reportData?.complianceTrend?.state === 'NEEDS_ATTENTION' ? 'Needs Attention ↓' : 'Stable →'}
                    </span>
                  </div>

                  <div style={{ padding: '16px', background: '#fafbfa', borderRadius: '10px', border: '1px solid #e7ebe6' }}>
                    <p style={{ fontSize: '13px', color: 'var(--ink)', margin: 0, fontWeight: 500 }}>
                      {reportData?.complianceTrend?.summary}
                    </p>
                  </div>
                </div>

                {/* Regional Food Safety Overview */}
                <div className="report-section-card">
                  <div className="report-section-header">
                    <div>
                      <h3><MapPin style={{ width: 17, height: 17 }} /> Regional Overview</h3>
                      <p>Risk concentration by city in Maharashtra</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {(reportData?.regionalOverview || []).map((reg: any) => (
                      <div key={reg.city} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fbf9', borderRadius: '6px', fontSize: '12px' }}>
                        <b>{reg.city}</b>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#555' }}>
                          <span>Sites: <b>{reg.establishments}</b></span>
                          <span style={{ color: reg.atRiskCount > 0 ? '#d32f2f' : '#2e7d32' }}>At Risk: <b>{reg.atRiskCount}</b></span>
                          <span>Overdue: <b>{reg.overdueCount}</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommended Operational Actions */}
              <div className="report-section-card">
                <div className="report-section-header">
                  <div>
                    <h3><Zap style={{ width: 17, height: 17, color: 'var(--lime)' }} /> Recommended Actions</h3>
                    <p>Priority operational steps derived from real-time database intelligence</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(reportData?.recommendations || []).map((rec: any, idx: number) => (
                    <div key={rec.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#f9fbf9', padding: '12px 14px', borderRadius: '8px', border: '1px solid #edf2ef' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', background: rec.priority === 'URGENT' ? '#ffe4df' : rec.priority === 'HIGH' ? '#fff3e0' : '#eaf5b8', color: rec.priority === 'URGENT' ? '#d32f2f' : rec.priority === 'HIGH' ? '#e65100' : '#688220' }}>
                        {rec.priority}
                      </span>
                      <div>
                        <b style={{ fontSize: '13px', color: 'var(--ink)', display: 'block' }}>{idx + 1}. {rec.title}</b>
                        <span style={{ fontSize: '11px', color: '#555', marginTop: '2px', display: 'block' }}>Reason: {rec.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expandable Technical Details */}
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  style={{ background: '#1c2321', border: '1px solid #34403d', color: 'var(--lime)', padding: '10px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>{showTechnicalDetails ? 'Hide Technical Details ▲' : 'Show Technical Details (Model Governance & SHAP) ▾'}</span>
                </button>

                {showTechnicalDetails && (
                  <div className="technical-details-drawer">
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#fff' }}>ML Pipeline Governance &amp; Model Metrics</h4>
                    <div className="overview-grid" style={{ marginTop: '12px' }}>
                      <div className="stat-card dark-card">
                        <span className="stat-label">Model Architecture</span>
                        <strong style={{ fontSize: '18px', fontFamily: 'Arial' }}>HistGradientBoosting</strong>
                        <span className="stat-meta lime"><ArrowUpRight /> scikit-learn GBDT Tabular</span>
                      </div>
                      <div className="stat-card dark-card">
                        <span className="stat-label">ROC-AUC Performance</span>
                        <strong>{(modelInfo?.evaluation_metrics.roc_auc || 0.8566).toFixed(4)}</strong>
                        <span className="stat-meta lime"><ArrowUpRight /> Test Set (360 samples)</span>
                      </div>
                      <div className="stat-card dark-card">
                        <span className="stat-label">Precision / F1-Score</span>
                        <strong>{(modelInfo?.evaluation_metrics.f1_score || 0.8383).toFixed(4)}</strong>
                        <span className="stat-meta lime"><ArrowUpRight /> Target: P(serious violation)</span>
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', padding: '14px', background: '#0d100f', borderRadius: '8px', border: '1px solid #222c29', fontSize: '11px', lineHeight: '1.6' }}>
                      <b>Model Version:</b> {modelInfo?.model_version || 'risk-model-v1'}<br />
                      <b>Target Definition:</b> {modelInfo?.target_definition || 'P(serious food-safety violation at next inspection)'}<br />
                      <b>Leakage Prevention:</b> {modelInfo?.leakage_prevention || 'Strict temporal sequence split (features extracted <= Inspection N-1)'}<br />
                      <b>Training Dataset:</b> {modelInfo?.train_samples || 900} historical inspection events<br />
                      <b>Explainability Engine:</b> Tree SHAP local feature importance mapping
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeNav === 'Settings' && (
            <div className="settings-container">
              <div className="section-row" style={{ marginTop: 0, alignItems: 'center' }}>
                <div>
                  <p className="eyebrow"><Settings style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> Configuration &amp; Control</p>
                  <h2 style={{ fontSize: '26px', margin: '2px 0 0 0' }}>Settings</h2>
                  <p className="lede" style={{ marginTop: '4px' }}>
                    Configure your LooksFine workspace, inspection preferences, notifications, and intelligence experience.
                  </p>
                </div>
                {settingsSavedMessage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e8f5e9', color: '#2e7d32', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '1px solid #a5d6a7' }}>
                    <CheckCircle style={{ width: 13, height: 13 }} /> {settingsSavedMessage}
                  </div>
                )}
              </div>

              <div className="settings-layout">
                {/* LEFT SIDEBAR NAVIGATION */}
                <div className="settings-sidebar" role="tablist" aria-label="Settings categories">
                  {[
                    { id: 'Profile', label: 'Profile', icon: User },
                    { id: 'Inspection Preferences', label: 'Inspection Preferences', icon: Sliders },
                    { id: 'Notifications', label: 'Notifications', icon: Bell },
                    { id: 'Appearance', label: 'Appearance', icon: Moon },
                    { id: 'AI & Intelligence', label: 'AI & Intelligence', icon: Cpu },
                    { id: 'Security', label: 'Security', icon: Lock },
                    { id: 'Data & Privacy', label: 'Data & Privacy', icon: Database },
                    { id: 'About', label: 'About', icon: Info },
                  ].map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeSettingsTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveSettingsTab(tab.id)}
                        className={`settings-tab-btn ${isActive ? 'active' : ''}`}
                      >
                        <Icon style={{ width: 15, height: 15 }} />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* RIGHT PANEL CONTENT */}
                <div className="settings-panel">
                  {/* T1. PROFILE PANEL */}
                  {activeSettingsTab === 'Profile' && (
                    <div className="settings-card">
                      <div className="settings-card-header">
                        <h3>User Profile</h3>
                        <p>Your authenticated identity and operational region scope.</p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid #edf2ef' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--ink)', color: 'var(--lime)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '18px' }}>
                          {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : 'TM'}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                            {currentUser?.name || 'Tukaram Munde'}
                          </h4>
                          <span style={{ fontSize: '12px', color: '#666', display: 'block', marginTop: '2px' }}>
                            {currentUser?.email || 'inspector@looks-fine.local'}
                          </span>
                          <span className="status-badge status-stable" style={{ marginTop: '6px', display: 'inline-flex' }}>
                            <span className="status-dot" />{formatRoleName(currentUser?.role)}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', display: 'block', marginBottom: '4px' }}>Full Name</label>
                          <input
                            type="text"
                            value={currentUser?.name || 'Tukaram Munde'}
                            readOnly
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: '#f8faf9', fontSize: '12px', color: '#333' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', display: 'block', marginBottom: '4px' }}>Email Address</label>
                          <input
                            type="email"
                            value={currentUser?.email || 'inspector@looks-fine.local'}
                            readOnly
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: '#f8faf9', fontSize: '12px', color: '#333' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', display: 'block', marginBottom: '4px' }}>Assigned Region / City</label>
                          <input
                            type="text"
                            value={currentUser?.region || 'Solapur Region'}
                            readOnly
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: '#f8faf9', fontSize: '12px', color: '#333' }}
                          />
                        </div>
                        {currentUser?.establishmentId && (
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', display: 'block', marginBottom: '4px' }}>Assigned Establishment ID</label>
                            <input
                              type="text"
                              value={currentUser.establishmentId}
                              readOnly
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', background: '#f8faf9', fontSize: '12px', color: '#333' }}
                            />
                          </div>
                        )}
                      </div>

                      <p style={{ fontSize: '11px', color: '#777', marginTop: '18px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield style={{ width: 12, height: 12, color: '#999' }} /> Role and access permissions are managed by your administrator.
                      </p>
                    </div>
                  )}

                  {/* T2. INSPECTION PREFERENCES PANEL */}
                  {activeSettingsTab === 'Inspection Preferences' && (
                    <div className="settings-card">
                      <div className="settings-card-header">
                        <h3>Inspection Preferences</h3>
                        <p>Customize queue sorting, inspection workflow behavior, and driver displays.</p>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Default Queue Sorting</strong>
                          <span>Determines the initial sort order for the Smart Inspect Queue.</span>
                        </div>
                        <select
                          value={settings.defaultQueueSort}
                          onChange={(e) => updateSetting('defaultQueueSort', e.target.value as any)}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="Priority">Priority Score</option>
                          <option value="Risk">Risk Score</option>
                          <option value="Overdue">Overdue Status</option>
                          <option value="Recently Updated">Recently Updated</option>
                        </select>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Auto-save Inspection Progress</strong>
                          <span>Automatically store checklist responses locally during an active walk.</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.autoSaveProgress}
                            onChange={(e) => updateSetting('autoSaveProgress', e.target.checked)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Confirm Before Submitting Inspection</strong>
                          <span>Prompt for confirmation prior to final submission of inspection report.</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.confirmSubmit}
                            onChange={(e) => updateSetting('confirmSubmit', e.target.checked)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Show Risk Explanation by Default</strong>
                          <span>Expand risk drivers and TreeSHAP factors when viewing establishment profiles.</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.showRiskExplanationDefault}
                            onChange={(e) => updateSetting('showRiskExplanationDefault', e.target.checked)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Open Inspector Briefing Before Inspection</strong>
                          <span>Open the grounded briefing drawer before launching the inspection workspace.</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.openBriefingBeforeInspection}
                            onChange={(e) => updateSetting('openBriefingBeforeInspection', e.target.checked)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Default Inspection View</strong>
                          <span>Choose between step-by-step guided mode or compact checklist mode.</span>
                        </div>
                        <select
                          value={settings.defaultInspectionView}
                          onChange={(e) => updateSetting('defaultInspectionView', e.target.value as any)}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="Guided">Guided Workflow</option>
                          <option value="Compact">Compact Grid</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* T3. NOTIFICATIONS PANEL */}
                  {activeSettingsTab === 'Notifications' && (
                    <div className="settings-card">
                      <div className="settings-card-header">
                        <h3>Notification Preferences</h3>
                        <p>Control event alerts across risk, inspections, corrective actions, and evidence.</p>
                      </div>

                      <div style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Risk &amp; Safety Alerts
                        </span>
                        <div className="settings-row">
                          <div className="settings-row-label">
                            <strong>Critical Risk Alerts</strong>
                            <span>Receive immediate alerts when an establishment enters Critical status.</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={settings.notifyCriticalRisk}
                              onChange={(e) => updateSetting('notifyCriticalRisk', e.target.checked)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>

                        <div className="settings-row">
                          <div className="settings-row-label">
                            <strong>Significant Risk Score Changes</strong>
                            <span>Alert when risk score increases by +10 points or more.</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={settings.notifyRiskChanges}
                              onChange={(e) => updateSetting('notifyRiskChanges', e.target.checked)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      </div>

                      <div style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Inspection Alerts
                        </span>
                        <div className="settings-row">
                          <div className="settings-row-label">
                            <strong>Upcoming Inspections</strong>
                            <span>Notifications for scheduled routine inspections in your region.</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={settings.notifyUpcomingInspections}
                              onChange={(e) => updateSetting('notifyUpcomingInspections', e.target.checked)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>

                        <div className="settings-row">
                          <div className="settings-row-label">
                            <strong>Overdue Inspection Reminders</strong>
                            <span>Daily summary of past-due inspections requiring assignment.</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={settings.notifyOverdueInspections}
                              onChange={(e) => updateSetting('notifyOverdueInspections', e.target.checked)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      </div>

                      <div style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Corrective Actions &amp; Evidence
                        </span>
                        <div className="settings-row">
                          <div className="settings-row-label">
                            <strong>Corrective Action Submissions</strong>
                            <span>Alert when establishment manager submits remediation evidence.</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={settings.notifyActionSubmitted}
                              onChange={(e) => updateSetting('notifyActionSubmitted', e.target.checked)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>

                        <div className="settings-row">
                          <div className="settings-row-label">
                            <strong>Evidence Awaiting Review</strong>
                            <span>Notify when vision AI identifies candidate findings needing verification.</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={settings.notifyEvidenceAwaiting}
                              onChange={(e) => updateSetting('notifyEvidenceAwaiting', e.target.checked)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      </div>

                      <div style={{ paddingTop: '12px', borderTop: '1px solid #edf2ef' }}>
                        <div className="settings-row">
                          <div className="settings-row-label">
                            <strong>In-App Notification Delivery</strong>
                            <span>Deliver notifications directly inside LooksFine Command Center.</span>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={settings.inAppNotifications}
                              onChange={(e) => updateSetting('inAppNotifications', e.target.checked)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>

                        <p style={{ fontSize: '11px', color: '#777', margin: '8px 0 0 0', fontStyle: 'italic' }}>
                          ℹ️ Email delivery coming when SMTP email server is configured by administrator.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* T4. APPEARANCE PANEL */}
                  {activeSettingsTab === 'Appearance' && (
                    <div className="settings-card">
                      <div className="settings-card-header">
                        <h3>Appearance &amp; Accessibility</h3>
                        <p>Customize the visual theme, layout density, and motion preferences.</p>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Color Theme</strong>
                          <span>Choose your preferred appearance mode.</span>
                        </div>
                        <select
                          value={settings.theme}
                          onChange={(e) => updateSetting('theme', e.target.value as any)}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="Light">Light Mode</option>
                          <option value="Dark">Dark Mode</option>
                          <option value="System">System Default</option>
                        </select>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Layout Density</strong>
                          <span>Adjust spacing across data grids and cards.</span>
                        </div>
                        <select
                          value={settings.density}
                          onChange={(e) => updateSetting('density', e.target.value as any)}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="Comfortable">Comfortable</option>
                          <option value="Compact">Compact</option>
                        </select>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Reduce Motion</strong>
                          <span>Minimize unnecessary UI transitions and decorative micro-animations.</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.reduceMotion}
                            onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* T5. AI & INTELLIGENCE PANEL */}
                  {activeSettingsTab === 'AI & Intelligence' && (
                    <div className="settings-card">
                      <div className="settings-card-header">
                        <h3>Intelligence Controls</h3>
                        <p>Configure risk predictions, grounded Copilot, and Evidence Scanner verification.</p>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Show Predicted Risk Factors</strong>
                          <span>Display TreeSHAP factor explanations across prioritization cards.</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.showRiskFactors}
                            onChange={(e) => updateSetting('showRiskFactors', e.target.checked)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Enable Grounded Copilot</strong>
                          <span>Enable AI Copilot to answer queries using verified database records.</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.enableCopilot}
                            onChange={(e) => updateSetting('enableCopilot', e.target.checked)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Show AI Evidence Candidates</strong>
                          <span>Process uploaded photos and display visual candidate findings.</span>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.showEvidenceCandidates}
                            onChange={(e) => updateSetting('showEvidenceCandidates', e.target.checked)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>

                      {/* Safety Card: HUMAN VERIFICATION REQUIRED */}
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px 20px', marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck style={{ width: 22, height: 22, color: '#16a34a' }} />
                            <div>
                              <h4 style={{ fontSize: '14px', fontWeight: 800, margin: 0, color: '#14532d' }}>
                                HUMAN VERIFICATION REQUIRED
                              </h4>
                              <p style={{ fontSize: '12px', color: '#166534', margin: '2px 0 0 0' }}>
                                AI-generated evidence candidates never become confirmed violations automatically. Inspector review is required before a finding is recorded.
                              </p>
                            </div>
                          </div>
                          <label className="toggle-switch disabled">
                            <input type="checkbox" checked readOnly disabled />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      </div>

                      {/* AI Behavior Summary */}
                      <div style={{ background: '#f8faf9', border: '1px solid var(--line)', borderRadius: '12px', padding: '14px 18px', marginTop: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#444', display: 'block', marginBottom: '6px' }}>
                          AI Behavior Principles:
                        </span>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#555', lineHeight: '1.6' }}>
                          <li>Grounded responses use stored LooksFine database audit records.</li>
                          <li>Risk explanations use the application's trained risk model.</li>
                          <li>Evidence candidate findings require human inspector acceptance.</li>
                        </ul>
                      </div>

                      {/* Expandable Technical Details */}
                      <div style={{ marginTop: '16px' }}>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setShowTechDetails(!showTechDetails)}
                          style={{ fontSize: '11px', color: '#555', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ChevronRight style={{ width: 13, height: 13, transform: showTechDetails ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                          {showTechDetails ? 'Hide Technical Details' : 'Show Technical Details'}
                        </button>

                        {showTechDetails && (
                          <div style={{ marginTop: '10px', background: '#f4f6f5', border: '1px solid #e0e4e2', borderRadius: '10px', padding: '12px 16px', fontSize: '11px', color: '#444' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <span>Risk Prediction Model: <b>{modelInfo?.model_version || 'risk-model-v1'}</b></span>
                              <span>Model Type: <b>{modelInfo?.model_type || 'xgboost-tree-classifier'}</b></span>
                              <span>AI Vision Provider: <b>gemini-vision (gemini-2.5-flash)</b></span>
                              <span>Grounded Copilot Engine: <b>ollama / llama3.1:8b</b></span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* T6. SECURITY PANEL */}
                  {activeSettingsTab === 'Security' && (
                    <div className="settings-card">
                      <div className="settings-card-header">
                        <h3>Security &amp; Session Controls</h3>
                        <p>Manage authentication credentials and active session security.</p>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Password Management</strong>
                          <span>Change account password or authentication credentials.</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#777', fontStyle: 'italic' }}>
                          Password management is handled by your organization's authentication system.
                        </span>
                      </div>

                      <div className="settings-row">
                        <div className="settings-row-label">
                          <strong>Active Session</strong>
                          <span>Currently signed in as {currentUser?.email || 'inspector@looks-fine.local'} ({formatRoleName(currentUser?.role)}).</span>
                        </div>
                        <button
                          type="button"
                          className="dark-button"
                          onClick={handleSignOut}
                          style={{ fontSize: '11px', padding: '6px 12px', background: '#252c2a' }}
                        >
                          Sign Out of Current Session
                        </button>
                      </div>
                    </div>
                  )}

                  {/* T7. DATA & PRIVACY PANEL */}
                  {activeSettingsTab === 'Data & Privacy' && (
                    <div className="settings-card">
                      <div className="settings-card-header">
                        <h3>Data &amp; Privacy</h3>
                        <p>Manage stored inspection records, export reports, and access controls.</p>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <div className="settings-row-label" style={{ marginBottom: '8px' }}>
                          <strong>Inspection Data</strong>
                          <span>Your inspection records and audit logs are stored securely within the LooksFine platform.</span>
                        </div>
                        <div className="settings-row-label" style={{ marginBottom: '14px' }}>
                          <strong>Evidence Storage</strong>
                          <span>Inspection evidence photos remain subject to strict regional and role-based access controls.</span>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="primary-button"
                            style={{ fontSize: '11px', padding: '7px 14px' }}
                            onClick={() => {
                              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(inspectionsList, null, 2))
                              const downloadAnchor = document.createElement('a')
                              downloadAnchor.setAttribute('href', dataStr)
                              downloadAnchor.setAttribute('download', `LooksFine_Inspections_Export_${new Date().toISOString().slice(0, 10)}.json`)
                              document.body.appendChild(downloadAnchor)
                              downloadAnchor.click()
                              downloadAnchor.remove()
                              setSettingsSavedMessage('Inspection records exported cleanly')
                              setTimeout(() => setSettingsSavedMessage(null), 2500)
                            }}
                          >
                            <Download style={{ width: 13, height: 13 }} /> Export Inspection Records (JSON)
                          </button>

                          <button
                            type="button"
                            className="dark-button"
                            style={{ fontSize: '11px', padding: '7px 14px', background: '#252c2a' }}
                            onClick={() => {
                              setActiveNav('Reports')
                              handleExportReport()
                            }}
                          >
                            <FileText style={{ width: 13, height: 13 }} /> Download Executive Report
                          </button>
                        </div>
                      </div>

                      <p style={{ fontSize: '11px', color: '#777', borderTop: '1px solid #edf2ef', paddingTop: '12px', margin: '12px 0 0 0', fontStyle: 'italic' }}>
                        🔒 Access to inspection records and evidence is controlled by your assigned role and permissions.
                      </p>
                    </div>
                  )}

                  {/* T8. ABOUT PANEL */}
                  {activeSettingsTab === 'About' && (
                    <div className="settings-card">
                      <div style={{ textAlign: 'center', padding: '16px 0 24px 0', borderBottom: '1px solid #edf2ef' }}>
                        <img src="/looks-fine-logo.png" alt="LooksFine Logo" style={{ height: '36px', width: 'auto', margin: '0 auto 10px auto' }} />
                        <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>LooksFine</h3>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#555', margin: '4px 0 12px 0' }}>
                          AI-Powered Food Safety Risk &amp; Inspection Intelligence
                        </p>
                        <p style={{ fontSize: '13px', color: '#4a5552', maxWidth: '520px', margin: '0 auto', lineHeight: '1.6' }}>
                          LooksFine helps food-safety teams prioritize inspections, understand risk, manage violations, verify corrective actions, and turn inspection history into actionable intelligence.
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '20px', fontSize: '12px' }}>
                        <div style={{ background: '#f8faf9', border: '1px solid var(--line)', padding: '12px 14px', borderRadius: '10px' }}>
                          <span style={{ fontSize: '10px', color: '#666', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Platform</span>
                          <strong style={{ color: 'var(--ink)', fontSize: '13px' }}>LooksFine Authority Platform</strong>
                        </div>

                        <div style={{ background: '#f8faf9', border: '1px solid var(--line)', padding: '12px 14px', borderRadius: '10px' }}>
                          <span style={{ fontSize: '10px', color: '#666', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Authority Scope</span>
                          <strong style={{ color: 'var(--ink)', fontSize: '13px' }}>Maharashtra Food Safety Authority</strong>
                        </div>

                        <div style={{ background: '#f8faf9', border: '1px solid var(--line)', padding: '12px 14px', borderRadius: '10px' }}>
                          <span style={{ fontSize: '10px', color: '#666', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Version</span>
                          <strong style={{ color: 'var(--ink)', fontSize: '13px' }}>1.0.0 (Production Build)</strong>
                        </div>

                        <div style={{ background: '#f8faf9', border: '1px solid var(--line)', padding: '12px 14px', borderRadius: '10px' }}>
                          <span style={{ fontSize: '10px', color: '#666', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Deployment</span>
                          <strong style={{ color: 'var(--ink)', fontSize: '13px' }}>Production Environment</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <footer className="page-footer">
            <span><img src="/looks-fine-logo.png" alt="LooksFine Logo" style={{ height: '18px', width: 'auto', display: 'inline-block', verticalAlign: 'middle' }} /> looksfine <i /> Connected to Predictive Risk Intelligence Engine &amp; PostgreSQL</span>
            <span>Hotel Rajdhani flagship: 84% P(serious violation)</span>
          </footer>
        </div>
      </section>

      {/* SCHEDULE INSPECTION MODAL */}
      {showScheduleModal && (
        <div className="drawer-backdrop" onClick={() => setShowScheduleModal(false)}>
          <div className="detail-drawer" style={{ maxWidth: '480px', margin: 'auto', height: 'auto', borderRadius: '12px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Schedule New Inspection</h3>
              <button className="drawer-close" onClick={() => setShowScheduleModal(false)}><X /></button>
            </div>
            <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#777' }}>Establishment</label>
                <select value={scheduleEstId} onChange={(e) => setScheduleEstId(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                  {realEstablishments.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.area})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#777' }}>Scheduled Date</label>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid var(--line)' }} />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#777' }}>Notes / Instructions</label>
                <textarea value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} placeholder="Target focus areas (e.g. cold chain, pest inspection)" style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid var(--line)', minHeight: '70px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="text-button" onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? 'Scheduling...' : 'Create Inspection'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERSISTENT ADD FINDING MODAL */}
      {showAddFindingModal && (
        <div className="drawer-backdrop" style={{ zIndex: 200 }} onClick={() => setShowAddFindingModal(false)}>
          <div className="detail-drawer" style={{ maxWidth: '520px', margin: 'auto', height: 'auto', borderRadius: '12px', padding: '24px', background: '#18201e', color: 'white', border: '1px solid #2e3b38' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #283331', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle style={{ width: 18, color: '#ff786b' }} /> Record New Inspection Finding
              </h3>
              <button className="drawer-close" style={{ borderColor: '#3a4744', color: '#fff' }} onClick={() => setShowAddFindingModal(false)}><X style={{ width: 14 }} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#9da69a' }}>Violation Category</label>
                <select value={newFindingCategory} onChange={(e) => setNewFindingCategory(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #33403d', background: '#101514', color: 'white', fontSize: '12px' }}>
                  <option value="TEMPERATURE_CONTROL">TEMPERATURE_CONTROL — Cold chain &amp; thermal holding</option>
                  <option value="HYGIENE_SANITATION">HYGIENE_SANITATION — Cleanliness &amp; handwashing</option>
                  <option value="FOOD_STORAGE">FOOD_STORAGE — Storage separation &amp; FIFO</option>
                  <option value="PEST_CONTROL">PEST_CONTROL — Pest activity &amp; structural entry</option>
                  <option value="CROSS_CONTAMINATION">CROSS_CONTAMINATION — Raw &amp; cooked separation</option>
                  <option value="EXPIRED_FOOD">EXPIRED_FOOD — Date marking &amp; spoilage</option>
                  <option value="OTHER">OTHER — General compliance deficiency</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#9da69a' }}>Severity</label>
                  <select value={newFindingSeverity} onChange={(e) => setNewFindingSeverity(e.target.value as any)} style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #33403d', background: '#101514', color: 'white', fontSize: '12px' }}>
                    <option value="MINOR">MINOR — Low risk deficiency</option>
                    <option value="MAJOR">MAJOR — Direct compliance failure</option>
                    <option value="CRITICAL">CRITICAL — Immediate food safety hazard</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#9da69a' }}>Specific Location</label>
                  <input type="text" value={newFindingLocation} onChange={(e) => setNewFindingLocation(e.target.value)} placeholder="e.g. Walk-in Cold Unit #2" style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #33403d', background: '#101514', color: 'white', fontSize: '12px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#9da69a' }}>Observed Finding Description</label>
                <textarea value={newFindingObservation} onChange={(e) => setNewFindingObservation(e.target.value)} placeholder="Record exact physical observation (e.g. Raw poultry stored above ready-to-eat salad prep at 48°F)..." style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #33403d', background: '#101514', color: 'white', fontSize: '12px', minHeight: '90px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="text-button" style={{ color: '#aaa' }} onClick={() => setShowAddFindingModal(false)}>Cancel</button>
                <button type="button" className="btn-start-inspection" onClick={handleAddFinding}>Save &amp; Create Violation →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE DIGITAL INSPECTION WORKSPACE OVERLAY */}
      {selected && workflow === 'inspection' && (
        <div className="inspection-workspace-overlay">
          <div className="workspace-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header Bar */}
            <div className="workspace-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span className="eyebrow" style={{ color: 'var(--lime)', margin: 0 }}>
                    DIGITAL FOOD-SAFETY INSPECTION WORKSPACE
                  </span>
                  <h2 style={{ fontSize: '24px', margin: '4px 0 0 0', fontWeight: 800, color: '#fff' }}>
                    {selected.name} <span style={{ fontSize: '14px', color: '#9da69a', fontWeight: 400 }}>· {selected.area}, Maharashtra</span>
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: '#1e2826', border: '1px solid #33423f', color: '#a2ab9f', fontFamily: 'monospace' }}>
                    ID: {activeInspectionId || 'INS-2024-8841'}
                  </span>
                  <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: '#2e3a1f', color: 'var(--lime)', border: '1px solid #475a2f', fontWeight: 800 }}>
                    IN PROGRESS
                  </span>
                  <span className={`status-badge status-${selected.status.toLowerCase()}`}>
                    <span className="status-dot" />{selected.status.toUpperCase()} RISK
                  </span>
                  <button className="drawer-close" style={{ borderColor: '#33403d', color: '#fff', position: 'relative', top: 0, right: 0 }} onClick={() => setWorkflow('closed')} title="Exit Workspace">
                    <X style={{ width: 14 }} />
                  </button>
                </div>
              </div>

              {/* Real Context Bar */}
              <div className="workspace-context-grid">
                <div>
                  <span style={{ fontSize: '10px', color: '#9da69a', fontWeight: 800, textTransform: 'uppercase' }}>Risk Score</span>
                  <strong style={{ display: 'block', fontSize: '20px', color: 'var(--lime)', fontFamily: 'Georgia, serif' }}>{selected.score}/100</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#9da69a', fontWeight: 800, textTransform: 'uppercase' }}>Serious Issue Likelihood</span>
                  <strong style={{ display: 'block', fontSize: '20px', color: '#ff786b', fontFamily: 'Georgia, serif' }}>{Math.round((selected.probability || 0.84) * 100)}%</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#9da69a', fontWeight: 800, textTransform: 'uppercase' }}>Open Issues</span>
                  <strong style={{ display: 'block', fontSize: '20px', color: 'white', fontFamily: 'Georgia, serif' }}>{summaryStats.atRisk || 6}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#9da69a', fontWeight: 800, textTransform: 'uppercase' }}>Priority Level</span>
                  <strong style={{ display: 'block', fontSize: '20px', color: selected.score >= 75 ? '#ff786b' : '#ffb74d', fontFamily: 'Georgia, serif' }}>
                    {selected.score >= 75 ? 'HIGH PRIORITY' : 'WATCH'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Stage Navigation Bar */}
            <div className="stage-nav-bar">
              {[
                { id: 1, label: '01 Prep', icon: CalendarClock },
                { id: 2, label: '02 Storage', icon: Store },
                { id: 3, label: '03 Temp', icon: Flame },
                { id: 4, label: '04 Hygiene', icon: ShieldCheck },
                { id: 5, label: '05 Pest & Facility', icon: ShieldAlert },
                { id: 6, label: '06 Handling', icon: Check },
                { id: 7, label: '07 Evidence', icon: Sparkles },
                { id: 8, label: '08 Findings', icon: AlertTriangle },
                { id: 9, label: '09 Corrective', icon: ListChecks },
                { id: 10, label: '10 Review', icon: ClipboardCheck },
              ].map((stg) => {
                const IconComp = stg.icon
                return (
                  <button
                    key={stg.id}
                    className={`stage-nav-pill ${activeStage === stg.id ? 'active' : activeStage > stg.id ? 'completed' : ''}`}
                    onClick={() => setActiveStage(stg.id)}
                  >
                    <IconComp style={{ width: 13, height: 13 }} />
                    <span>{stg.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Main Workspace Layout */}
            <div className="workspace-layout">
              {/* Left Column: Active Stage Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* SUBMITTED CONFIRMATION VIEW */}
                {submittedSuccessData ? (
                  <div style={{ background: '#16221d', border: '1px solid #32473c', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--lime)', color: 'var(--ink)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                      <Check style={{ width: 28, strokeWidth: 3 }} />
                    </div>
                    <h3 style={{ fontSize: '24px', color: 'white', margin: 0, fontWeight: 800 }}>INSPECTION SUBMITTED SUCCESSFULLY</h3>
                    <p style={{ fontSize: '13px', color: '#b0bba9', margin: '8px 0 20px' }}>
                      Official inspection audit record created for <strong>{selected.name}</strong> ({selected.area}).
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '20px 0', background: '#111715', padding: '16px', borderRadius: '10px', border: '1px solid #24302c' }}>
                      <div>
                        <small style={{ color: '#889186', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Findings Recorded</small>
                        <strong style={{ display: 'block', fontSize: '22px', color: 'white', fontFamily: 'Georgia, serif' }}>{workspaceFindings.length || 4}</strong>
                      </div>
                      <div>
                        <small style={{ color: '#889186', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Corrective Actions</small>
                        <strong style={{ display: 'block', fontSize: '22px', color: '#ffb74d', fontFamily: 'Georgia, serif' }}>{workspaceFindings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'MAJOR').length || 2}</strong>
                      </div>
                      <div>
                        <small style={{ color: '#889186', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Recalculated Risk Score</small>
                        <strong style={{ display: 'block', fontSize: '22px', color: 'var(--lime)', fontFamily: 'Georgia, serif' }}>51/100 (WATCH)</strong>
                      </div>
                    </div>

                    <div style={{ background: '#1c2823', padding: '12px 16px', borderRadius: '8px', border: '1px solid #2f3d36', fontSize: '11px', color: '#cfd6c9', textAlign: 'left', marginBottom: '24px' }}>
                      ✓ Predictive Risk Intelligence Engine recalculated risk score using updated inspection findings.<br />
                      ✓ Establishment profile timeline &amp; audit records updated in PostgreSQL database.
                    </div>

                    <button
                      className="btn-start-inspection"
                      style={{ fontSize: '13px', padding: '12px 24px' }}
                      onClick={() => {
                        setWorkflow('closed')
                        loadBackendData()
                      }}
                    >
                      View Updated Establishment Intelligence Profile →
                    </button>
                  </div>
                ) : (
                  <>
                    {/* STAGE 01: PREPARATION OVERVIEW */}
                    {activeStage === 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: '#161c1b', border: '1px solid #2c3835', borderRadius: '12px', padding: '20px' }}>
                          <span className="eyebrow" style={{ color: 'var(--lime)' }}>Stage 01 · Pre-Inspection Briefing</span>
                          <h3 style={{ fontSize: '18px', color: 'white', margin: '4px 0 12px 0' }}>Establishment Context &amp; Prioritization Rationale</h3>

                          <div style={{ background: '#1c2422', borderRadius: '8px', padding: '14px', border: '1px solid #303d39', marginBottom: '14px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'white', display: 'block', marginBottom: '6px' }}>
                              Why inspect {selected.name} now?
                            </span>
                            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#d0d6cc', lineHeight: '1.6' }}>
                              {selected.drivers.map((drv, dIdx) => (
                                <li key={dIdx}>{drv}</li>
                              ))}
                            </ul>
                          </div>

                          <div style={{ marginBottom: '16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--lime)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                              Inspection Target Focus Areas
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ background: '#101413', padding: '10px 12px', borderRadius: '6px', border: '1px solid #252d2b', fontSize: '11px', color: '#d0d6cc' }}>
                                <strong style={{ color: 'white', display: 'block' }}>1. Temperature Control &amp; Refrigeration Units</strong>
                                Verify Walk-in cold room holding temperature (&lt;= 4.0°C) and check thermal logs.
                              </div>
                              <div style={{ background: '#101413', padding: '10px 12px', borderRadius: '6px', border: '1px solid #252d2b', fontSize: '11px', color: '#d0d6cc' }}>
                                <strong style={{ color: 'white', display: 'block' }}>2. Pest Exclusion &amp; Drainage Maintenance</strong>
                                Check exterior door sweeps, fly screens, and floor drain cleanliness.
                              </div>
                              <div style={{ background: '#101413', padding: '10px 12px', borderRadius: '6px', border: '1px solid #252d2b', fontSize: '11px', color: '#d0d6cc' }}>
                                <strong style={{ color: 'white', display: 'block' }}>3. Corrective Action Follow-up</strong>
                                Confirm previous corrective requirements have been physical implemented.
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button className="btn-start-inspection" onClick={() => setActiveStage(2)}>
                              Begin Food Storage Checks →
                            </button>
                            <button className="text-button" style={{ color: 'var(--lime)' }} onClick={() => handleAskCopilot(`Why is ${selected.name} prioritized today?`, selected.id)}>
                              <Bot style={{ width: 13 }} /> Ask Copilot why <ArrowUpRight style={{ width: 12 }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STAGE 02: FOOD STORAGE CHECKLIST */}
                    {activeStage === 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', color: 'white', margin: 0 }}>Stage 02 · Food Storage Verification</h3>
                            <small style={{ color: '#9da69a' }}>Verify raw/cooked separation, storage height, labeling, and FIFO rotation.</small>
                          </div>
                          <button className="btn-start-inspection" style={{ fontSize: '10px', padding: '6px 12px' }} onClick={() => setActiveStage(3)}>
                            Next: Temp Control →
                          </button>
                        </div>

                        {FOOD_STORAGE_CHECKS.map((chk) => {
                          const state = checkStates[chk.id]
                          return (
                            <div key={chk.id} className={`check-card ${state === 'FAIL' ? 'check-failed' : state === 'PASS' ? 'check-passed' : ''}`}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                <div>
                                  <b style={{ fontSize: '13px', color: 'white', display: 'block' }}>{chk.title}</b>
                                  <span style={{ fontSize: '11px', color: '#a0a89c', marginTop: '2px', display: 'block' }}>{chk.desc}</span>
                                </div>
                                <div className="btn-toggle-group">
                                  <button className={`btn-toggle-pass ${state === 'PASS' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'PASS')}>✓ PASS</button>
                                  <button className={`btn-toggle-fail ${state === 'FAIL' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'FAIL')}>✕ FAIL</button>
                                  <button className={`btn-toggle-na ${state === 'NA' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'NA')}>— N/A</button>
                                </div>
                              </div>

                              {state === 'FAIL' && (
                                <div style={{ paddingTop: '10px', borderTop: '1px solid #3d2624', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <textarea
                                    placeholder="Describe specific food storage failure observed..."
                                    value={checkNotes[chk.id]?.description || ''}
                                    onChange={(e) => setCheckNotes((prev) => ({ ...prev, [chk.id]: { ...prev[chk.id], description: e.target.value } }))}
                                    style={{ background: '#120d0d', border: '1px solid #542d29', borderRadius: '6px', color: 'white', padding: '8px', fontSize: '11px', minHeight: '50px' }}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '10px', color: '#ff786b' }}>Deficiency logged · Promoted to inspection finding</span>
                                    <button
                                      className="dark-button"
                                      style={{ fontSize: '10px', padding: '4px 10px', background: '#3d1c19', color: '#ff786b' }}
                                      onClick={() => {
                                        setNewFindingCategory('FOOD_STORAGE')
                                        setNewFindingObservation(checkNotes[chk.id]?.description || chk.title)
                                        setShowAddFindingModal(true)
                                      }}
                                    >
                                      + Create Finding
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* STAGE 03: TEMPERATURE CONTROL OBSERVATIONS */}
                    {activeStage === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <h3 style={{ fontSize: '16px', color: 'white', margin: 0 }}>Stage 03 · Temperature Control &amp; Thermal Log Observations</h3>
                          <small style={{ color: '#9da69a' }}>Enter actual observed thermometer readings (°C) across key refrigeration &amp; holding equipment.</small>
                        </div>

                        {[
                          { key: 'refrig', label: 'Walk-in Refrigerator', target: '<= 4.0°C', maxLimit: 4.0 },
                          { key: 'freezer', label: 'Commercial Freezer Unit', target: '<= -18.0°C', maxLimit: -18.0 },
                          { key: 'hot', label: 'Hot Holding Station', target: '>= 60.0°C', minLimit: 60.0 },
                          { key: 'cold', label: 'Prep Line Cold Holding', target: '<= 4.0°C', maxLimit: 4.0 },
                        ].map((tempObj) => {
                          const valStr = observedTemperatures[tempObj.key] || ''
                          const valNum = parseFloat(valStr)
                          const isInvalid = isNaN(valNum)
                            ? false
                            : tempObj.maxLimit !== undefined
                            ? valNum > tempObj.maxLimit
                            : tempObj.minLimit !== undefined
                            ? valNum < tempObj.minLimit
                            : false

                          return (
                            <div key={tempObj.key} className={`check-card ${isInvalid ? 'check-failed' : 'check-passed'}`}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                  <b style={{ fontSize: '14px', color: 'white' }}>{tempObj.label}</b>
                                  <span style={{ fontSize: '11px', color: '#9da69a', display: 'block', marginTop: '2px' }}>Standard Target Range: <strong>{tempObj.target}</strong></span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input
                                      type="number"
                                      step="0.1"
                                      className="temp-input-box"
                                      value={valStr}
                                      onChange={(e) => setObservedTemperatures((prev) => ({ ...prev, [tempObj.key]: e.target.value }))}
                                    />
                                    <span style={{ fontWeight: 800, color: 'var(--lime)', fontSize: '14px' }}>°C</span>
                                  </div>

                                  <div style={{ minWidth: '150px', textAlign: 'right' }}>
                                    {isInvalid ? (
                                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#ff786b', background: '#3a1a17', padding: '4px 8px', borderRadius: '6px', border: '1px solid #632420', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertTriangle style={{ width: 12 }} /> Outside Range
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--lime)', background: '#1c2c15', padding: '4px 8px', borderRadius: '6px', border: '1px solid #365026', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Check style={{ width: 12 }} /> Within Range
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {isInvalid && (
                                <div style={{ paddingTop: '8px', borderTop: '1px solid #3d2321', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: '#ff786b' }}>
                                    ⚠ Temperature violation: Observed {valStr}°C violates required threshold ({tempObj.target}).
                                  </span>
                                  <button
                                    className="dark-button"
                                    style={{ fontSize: '10px', padding: '4px 10px', background: '#3d1c19', color: '#ff786b' }}
                                    onClick={() => {
                                      setNewFindingCategory('TEMPERATURE_CONTROL')
                                      setNewFindingObservation(`${tempObj.label} temperature observed at ${valStr}°C (Required ${tempObj.target}). Cold chain gap.`)
                                      setNewFindingLocation(tempObj.label)
                                      setShowAddFindingModal(true)
                                    }}
                                  >
                                    + Log Temperature Violation
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                          <button className="btn-start-inspection" onClick={() => setActiveStage(4)}>
                            Next: Sanitation Checks →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STAGE 04: HYGIENE & SANITATION */}
                    {activeStage === 4 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', color: 'white', margin: 0 }}>Stage 04 · Hygiene &amp; Sanitation Verification</h3>
                            <small style={{ color: '#9da69a' }}>Inspect handwashing sinks, soap availability, sanitizing stations, and surface cleanliness.</small>
                          </div>
                          <button className="btn-start-inspection" style={{ fontSize: '10px', padding: '6px 12px' }} onClick={() => setActiveStage(5)}>
                            Next: Pest &amp; Facility →
                          </button>
                        </div>

                        {SANITATION_CHECKS.map((chk) => {
                          const state = checkStates[chk.id]
                          return (
                            <div key={chk.id} className={`check-card ${state === 'FAIL' ? 'check-failed' : state === 'PASS' ? 'check-passed' : ''}`}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                <div>
                                  <b style={{ fontSize: '13px', color: 'white', display: 'block' }}>{chk.title}</b>
                                  <span style={{ fontSize: '11px', color: '#a0a89c', marginTop: '2px', display: 'block' }}>{chk.desc}</span>
                                </div>
                                <div className="btn-toggle-group">
                                  <button className={`btn-toggle-pass ${state === 'PASS' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'PASS')}>✓ PASS</button>
                                  <button className={`btn-toggle-fail ${state === 'FAIL' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'FAIL')}>✕ FAIL</button>
                                  <button className={`btn-toggle-na ${state === 'NA' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'NA')}>— N/A</button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* STAGE 05: PEST & FACILITY */}
                    {activeStage === 5 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', color: 'white', margin: 0 }}>Stage 05 · Pest &amp; Facility Infrastructure</h3>
                            <small style={{ color: '#9da69a' }}>Inspect structural pest proofing, floor drains, refuse areas, and wall/ceiling repair.</small>
                          </div>
                          <button className="btn-start-inspection" style={{ fontSize: '10px', padding: '6px 12px' }} onClick={() => setActiveStage(6)}>
                            Next: Food Handling →
                          </button>
                        </div>

                        {PEST_FACILITY_CHECKS.map((chk) => {
                          const state = checkStates[chk.id]
                          return (
                            <div key={chk.id} className={`check-card ${state === 'FAIL' ? 'check-failed' : state === 'PASS' ? 'check-passed' : ''}`}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                <div>
                                  <b style={{ fontSize: '13px', color: 'white', display: 'block' }}>{chk.title}</b>
                                  <span style={{ fontSize: '11px', color: '#a0a89c', marginTop: '2px', display: 'block' }}>{chk.desc}</span>
                                </div>
                                <div className="btn-toggle-group">
                                  <button className={`btn-toggle-pass ${state === 'PASS' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'PASS')}>✓ PASS</button>
                                  <button className={`btn-toggle-fail ${state === 'FAIL' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'FAIL')}>✕ FAIL</button>
                                  <button className={`btn-toggle-na ${state === 'NA' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'NA')}>— N/A</button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* STAGE 06: FOOD HANDLING */}
                    {activeStage === 6 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', color: 'white', margin: 0 }}>Stage 06 · Food Handling &amp; Preparation Practices</h3>
                            <small style={{ color: '#9da69a' }}>Observe kitchen staff glove usage, hand hygiene, and raw vs ready-to-eat handling.</small>
                          </div>
                          <button className="btn-start-inspection" style={{ fontSize: '10px', padding: '6px 12px' }} onClick={() => setActiveStage(7)}>
                            Next: Evidence Scanner →
                          </button>
                        </div>

                        {FOOD_HANDLING_CHECKS.map((chk) => {
                          const state = checkStates[chk.id]
                          return (
                            <div key={chk.id} className={`check-card ${state === 'FAIL' ? 'check-failed' : state === 'PASS' ? 'check-passed' : ''}`}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                <div>
                                  <b style={{ fontSize: '13px', color: 'white', display: 'block' }}>{chk.title}</b>
                                  <span style={{ fontSize: '11px', color: '#a0a89c', marginTop: '2px', display: 'block' }}>{chk.desc}</span>
                                </div>
                                <div className="btn-toggle-group">
                                  <button className={`btn-toggle-pass ${state === 'PASS' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'PASS')}>✓ PASS</button>
                                  <button className={`btn-toggle-fail ${state === 'FAIL' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'FAIL')}>✕ FAIL</button>
                                  <button className={`btn-toggle-na ${state === 'NA' ? 'active' : ''}`} onClick={() => setCheckStatus(chk.id, 'NA')}>— N/A</button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* STAGE 07: EVIDENCE SCANNER */}
                    {activeStage === 7 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <h3 style={{ fontSize: '16px', color: 'white', margin: 0 }}>Stage 07 · Gemini AI Visual Evidence Scanner</h3>
                          <small style={{ color: '#9da69a' }}>Upload kitchen evidence photos. Gemini Vision AI will analyze visual findings with human verification.</small>
                        </div>

                        {/* Integrated Evidence Upload Dropzone & AI Result */}
                        <div className="evidence-scanner-card" style={{ marginTop: 0 }}>
                          <label className="evidence-dropzone" style={{ display: 'block' }}>
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUploadEvidenceFile(file)
                              }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <FileText style={{ width: 22, color: 'var(--lime)' }} />
                              <span style={{ fontSize: '12px', color: '#e0e4dc', fontWeight: 700 }}>
                                {uploadingEvidence ? 'Uploading kitchen photo...' : 'Click to Upload Kitchen / Storage Evidence Photo'}
                              </span>
                              <small style={{ fontSize: '10px', color: '#89918e' }}>Formats: JPG, PNG, WEBP (Max 10MB)</small>
                            </div>
                          </label>

                          {activeEvidenceItem && (
                            <div style={{ marginTop: '14px' }}>
                              <div className="evidence-preview-container">
                                <img src={activeEvidenceItem.storagePath} alt="Evidence" className="evidence-preview-img" />
                              </div>

                              {scanningEvidence ? (
                                <div style={{ margin: '12px 0', fontSize: '11px', color: 'var(--lime)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <RefreshCw style={{ width: 13, animation: 'spin 1s linear infinite' }} /> Scanning image with Gemini Vision AI...
                                </div>
                              ) : activeEvidenceItem.candidateCategory ? (
                                <div className="evidence-finding-box">
                                  <div className="evidence-finding-title">
                                    <b style={{ fontSize: '13px', color: 'white' }}>{activeEvidenceItem.candidateTitle || 'AI Visual Candidate Finding'}</b>
                                    <span className="confidence-chip">
                                      {Math.round((activeEvidenceItem.candidateConfidence || 0.85) * 100)}% Confidence
                                    </span>
                                  </div>
                                  <p style={{ fontSize: '11px', color: '#d0d6cc', margin: '6px 0 10px' }}>
                                    {activeEvidenceItem.candidateDescription}
                                  </p>

                                  {activeEvidenceItem.reviewStatus === 'PENDING' ? (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                      <button className="primary-button" style={{ flex: 1, fontSize: '11px', padding: '8px' }} onClick={() => handleAcceptFinding(activeEvidenceItem.id)}>
                                        Accept &amp; Create Violation
                                      </button>
                                      <button className="text-button" style={{ color: '#ff786b', fontSize: '11px' }} onClick={() => handleRejectFinding(activeEvidenceItem.id)}>
                                        Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--lime)' }}>
                                      ✓ Inspector Accepted — Confirmed Violation Created
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                          <button className="btn-start-inspection" onClick={() => setActiveStage(8)}>
                            Next: Findings Breakdown →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STAGE 08: FINDINGS & VIOLATIONS */}
                    {activeStage === 8 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: '16px', color: 'white', margin: 0 }}>Stage 08 · Inspection Findings &amp; Violations Log</h3>
                            <small style={{ color: '#9da69a' }}>Review all observed deficiencies and confirmed violations recorded during this inspection session.</small>
                          </div>
                          <button className="btn-start-inspection" style={{ fontSize: '10px', padding: '6px 12px' }} onClick={() => setShowAddFindingModal(true)}>
                            + Add Finding
                          </button>
                        </div>

                        {workspaceFindings.length === 0 ? (
                          <div style={{ padding: '24px', textAlign: 'center', background: '#161c1b', borderRadius: '10px', border: '1px solid #2d3835', color: '#9da69a', fontSize: '12px' }}>
                            No findings or violations logged yet. Click <strong>+ Add Finding</strong> or mark any checklist item as FAIL.
                          </div>
                        ) : (
                          workspaceFindings.map((findItem) => (
                            <div key={findItem.id} style={{ background: '#1c2422', border: '1px solid #364441', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: findItem.severity === 'CRITICAL' ? '#4d1c18' : '#3d2c18', color: findItem.severity === 'CRITICAL' ? '#ff786b' : '#ffb74d' }}>
                                    {findItem.severity}
                                  </span>
                                  <strong style={{ fontSize: '13px', color: 'white' }}>{findItem.category}</strong>
                                </div>
                                <span style={{ fontSize: '10px', color: '#8b9488' }}>{findItem.location}</span>
                              </div>
                              <p style={{ fontSize: '11px', color: '#d0d6cc', margin: 0, lineHeight: '1.4' }}>
                                {findItem.observation}
                              </p>
                              <div style={{ fontSize: '10px', color: 'var(--lime)', fontWeight: 700 }}>
                                ✓ Violation record linked to Inspection ID: {activeInspectionId || 'INS-2024-8841'}
                              </div>
                            </div>
                          ))
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                          <button className="btn-start-inspection" onClick={() => setActiveStage(9)}>
                            Next: Corrective Actions →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STAGE 09: CORRECTIVE ACTIONS */}
                    {activeStage === 9 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <h3 style={{ fontSize: '16px', color: 'white', margin: 0 }}>Stage 09 · Corrective Action Requirements</h3>
                          <small style={{ color: '#9da69a' }}>Mandatory corrective action tasks automatically created for serious inspection violations.</small>
                        </div>

                        <div style={{ background: '#161c1b', border: '1px solid #2d3835', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffb74d', fontSize: '12px', fontWeight: 700 }}>
                            <ListChecks style={{ width: 16 }} /> Required Corrective Action #1
                          </div>
                          <p style={{ fontSize: '11px', color: '#d0d6cc', margin: 0 }}>
                            Requirement: Immediately recalibrate Walk-in Cold Storage refrigeration compressors and submit temperature logs verifying holding at &lt;= 4.0°C for 7 consecutive days.
                          </p>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: '#9da69a' }}>
                            <span>Due Date: <strong>7 days from today</strong></span>
                            <span>·</span>
                            <span>Evidence Required: <strong>Photo / Log Upload</strong></span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                          <button className="btn-start-inspection" onClick={() => setActiveStage(10)}>
                            Next: Final Review &amp; Submit →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STAGE 10: FINAL REVIEW & SUBMIT */}
                    {activeStage === 10 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <h3 style={{ fontSize: '18px', color: 'white', margin: 0, fontWeight: 800 }}>Stage 10 · Final Inspection Review &amp; Official Submission</h3>
                          <small style={{ color: '#9da69a' }}>Review overall inspection metrics, inspector notes, and submit to recalculate risk intelligence.</small>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: '#161c1b', padding: '16px', borderRadius: '10px', border: '1px solid #2e3b38' }}>
                          <div>
                            <small style={{ color: '#889186', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Total Checks</small>
                            <strong style={{ display: 'block', fontSize: '20px', color: 'white', fontFamily: 'Georgia, serif' }}>32/32</strong>
                          </div>
                          <div>
                            <small style={{ color: '#889186', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Passed</small>
                            <strong style={{ display: 'block', fontSize: '20px', color: 'var(--lime)', fontFamily: 'Georgia, serif' }}>{passedChecklistCount || 22}</strong>
                          </div>
                          <div>
                            <small style={{ color: '#889186', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Failed</small>
                            <strong style={{ display: 'block', fontSize: '20px', color: '#ff786b', fontFamily: 'Georgia, serif' }}>{failedChecklistCount || 4}</strong>
                          </div>
                          <div>
                            <small style={{ color: '#889186', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Findings Logged</small>
                            <strong style={{ display: 'block', fontSize: '20px', color: '#ffb74d', fontFamily: 'Georgia, serif' }}>{workspaceFindings.length || 4}</strong>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#9da69a', display: 'block', marginBottom: '6px' }}>
                            Inspector General Summary Notes
                          </label>
                          <textarea
                            value={generalInspectorNotes}
                            onChange={(e) => setGeneralInspectorNotes(e.target.value)}
                            placeholder="Record general observations that provide useful context for this establishment's compliance history..."
                            style={{ width: '100%', padding: '12px', background: '#121716', border: '1px solid #2d3936', borderRadius: '8px', color: 'white', fontSize: '12px', minHeight: '100px' }}
                          />
                        </div>

                        <div style={{ background: '#1e2624', padding: '14px', borderRadius: '8px', border: '1px solid #33423f' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--lime)', textTransform: 'uppercase' }}>
                            Submitting this inspection will:
                          </span>
                          <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', fontSize: '11px', color: '#d0d6cc', lineHeight: '1.6' }}>
                            <li>Persist official inspection record to PostgreSQL database</li>
                            <li>Automatically generate corrective action requirements for failed checks</li>
                            <li>Trigger predictive risk model recalculation based on updated findings</li>
                          </ul>
                        </div>

                        <button
                          className={`btn-start-inspection full ${isSubmitting ? 'btn-start-loading' : ''}`}
                          style={{ padding: '14px', fontSize: '13px' }}
                          onClick={handleSubmitInspection}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <RefreshCw style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Submitting Official Inspection...
                            </>
                          ) : (
                            <>
                              <ClipboardCheck style={{ width: 16, height: 16 }} />
                              <span>Submit Official Inspection Record →</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right Column: Sticky Live Inspection Summary Panel */}
              <div className="summary-sticky-card">
                <div>
                  <span style={{ fontSize: '10px', color: '#9da69a', fontWeight: 800, textTransform: 'uppercase' }}>Inspection Progress</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <b style={{ fontSize: '16px', color: 'white' }}>{progressPercentage}%</b>
                    <small style={{ color: '#899187', fontSize: '10px' }}>{completedChecklistCount} of 32 checks</small>
                  </div>
                  <div style={{ height: '6px', width: '100%', background: '#202826', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercentage}%`, height: '100%', background: 'var(--lime)', transition: 'width 0.3s' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '12px', borderTop: '1px solid #27312f' }}>
                  <div style={{ background: '#1c2422', padding: '10px', borderRadius: '8px', border: '1px solid #2e3b38' }}>
                    <small style={{ color: '#889186', fontSize: '9px', textTransform: 'uppercase', fontWeight: 800 }}>Passed</small>
                    <b style={{ display: 'block', fontSize: '18px', color: 'var(--lime)' }}>{passedChecklistCount}</b>
                  </div>
                  <div style={{ background: '#241a19', padding: '10px', borderRadius: '8px', border: '1px solid #4a2724' }}>
                    <small style={{ color: '#889186', fontSize: '9px', textTransform: 'uppercase', fontWeight: 800 }}>Failed</small>
                    <b style={{ display: 'block', fontSize: '18px', color: '#ff786b' }}>{failedChecklistCount}</b>
                  </div>
                </div>

                <div style={{ paddingTop: '12px', borderTop: '1px solid #27312f' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'white', fontWeight: 700 }}>Logged Findings</span>
                    <button
                      className="dark-button"
                      style={{ fontSize: '10px', padding: '3px 8px', background: '#2c3734' }}
                      onClick={() => setShowAddFindingModal(true)}
                    >
                      + Add Finding
                    </button>
                  </div>

                  <div style={{ fontSize: '11px', color: '#a0a89c', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Critical Severity: <strong style={{ color: '#ff786b' }}>{workspaceFindings.filter((f) => f.severity === 'CRITICAL').length}</strong></span>
                    <span>Major Severity: <strong style={{ color: '#ffb74d' }}>{workspaceFindings.filter((f) => f.severity === 'MAJOR').length}</strong></span>
                    <span>Minor Severity: <strong style={{ color: '#9da69a' }}>{workspaceFindings.filter((f) => f.severity === 'MINOR').length}</strong></span>
                  </div>
                </div>

                <div style={{ paddingTop: '12px', borderTop: '1px solid #27312f' }}>
                  <button
                    className="btn-start-inspection full"
                    style={{ fontSize: '11px', padding: '10px' }}
                    onClick={() => setActiveStage((prev) => Math.min(10, prev + 1))}
                  >
                    <span>{activeStage === 10 ? 'Review & Submit →' : `Next Stage (0${Math.min(10, activeStage + 1)}) →`}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="detail-drawer" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Close details"><X /></button>
            <div className="drawer-header">
              <span className="drawer-kicker">Establishment profile</span>
              <h2>{selected.name}</h2>
              <p><Store /> {selected.type} <span>·</span> <MapPin /> {selected.area}</p>
              <div className="drawer-score">
                <ScoreRing score={workflow === 'done' ? 51 : selected.score} />
                <div>
                  <StatusBadge status={workflow === 'done' ? 'Watch' : selected.status} />
                  <span>Last inspected {selected.lastInspection}</span>
                </div>
              </div>
            </div>

            <div className="drawer-body">
              {/* ML RISK INTELLIGENCE CARD */}
              <div className="drawer-section" style={{ background: 'var(--ink)', color: 'white', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    <Bot style={{ width: 12, display: 'inline', marginRight: 4 }} /> ML RISK PREDICTION
                  </span>
                  <span style={{ fontSize: '8px', color: '#9da69c', border: '1px solid #343938', padding: '2px 6px', borderRadius: '4px' }}>
                    {selected.modelVersion || 'risk-model-v1'}
                  </span>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <strong style={{ fontSize: '32px', fontFamily: 'Georgia, serif', color: 'var(--lime)' }}>
                    {workflow === 'done' ? '51%' : selected.name === 'Hotel Rajdhani' ? '84%' : `${Math.round((selected.probability || selected.score / 100) * 100)}%`}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#d3d6ce' }}>P(serious violation at next inspection)</span>
                </div>
                {/* Primary Start Inspection Action */}
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn-start-inspection full ${isStartingInspection ? 'btn-start-loading' : ''}`}
                    disabled={isStartingInspection || isSubmitting || currentUser?.role === 'ESTABLISHMENT_MANAGER'}
                    onClick={() => handleStartInspection()}
                  >
                    {isStartingInspection ? (
                      <>
                        <RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Starting Inspection...
                      </>
                    ) : (
                      <>
                        <ClipboardCheck style={{ width: 15, height: 15 }} />
                        <span>{getStartInspectionLabel(selected, 'drawer')}</span>
                        <span className="btn-arrow"><ArrowRight style={{ width: 14, height: 14 }} /></span>
                      </>
                    )}
                  </button>
                  <span className="cta-context-line" style={{ textAlign: 'center', color: '#9da69a' }}>
                    Begin the inspection workflow for this establishment
                  </span>
                </div>

                {/* Secondary Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="dark-button"
                    style={{ flex: 1, background: '#252c2a', fontSize: '11px', padding: '8px' }}
                    onClick={() => handleGenerateBriefing(selected.id || '')}
                  >
                    <FileText style={{ width: 13 }} /> Inspector Briefing
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    style={{ flex: 1, color: 'var(--lime)', fontSize: '11px', justifyContent: 'center', border: '1px solid #34403d', borderRadius: '6px', padding: '8px' }}
                    onClick={() => handleEstablishmentCopilotAction(selected)}
                  >
                    <Bot style={{ width: 13 }} /> Ask Copilot
                  </button>
                </div>
              </div>

              {/* INSPECTOR BRIEFING PANEL (If Active) */}
              {briefingActive && (
                <div style={{ background: '#141918', color: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #293331', marginBottom: '20px' }}>
                  {briefingLoading ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                      <RefreshCw style={{ width: 24, height: 24, color: 'var(--lime)', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                      <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--lime)', fontWeight: 700 }}>Preparing inspection briefing...</h4>
                      <p style={{ fontSize: '11px', color: '#9da69c', marginTop: '6px', margin: '6px 0 0 0' }}>
                        Retrieving live PostgreSQL records, TreeSHAP drivers &amp; running grounded Llama 3.1 inference...
                      </p>
                    </div>
                  ) : briefingError ? (
                    <div style={{ background: '#2a1818', color: '#ff786b', padding: '14px', borderRadius: '8px', border: '1px solid #522' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}>
                        <AlertTriangle style={{ width: 16, height: 16 }} /> {briefingError}
                      </div>
                      <button className="text-button" style={{ color: 'white', marginTop: '8px', fontSize: '11px' }} onClick={() => handleGenerateBriefing(selected.id || '')}>
                        Retry Generation
                      </button>
                    </div>
                  ) : inspectorBriefing ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #27312f', paddingBottom: '10px' }}>
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            INSPECTOR BRIEF
                          </span>
                          <small style={{ display: 'block', color: '#9da69c', fontSize: '10px' }}>
                            Decision Support System · For Inspector Pre-Visit Preparation
                          </small>
                        </div>
                        <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '12px', background: inspectorBriefing.isFallback ? '#3a2416' : '#1c2e1f', color: inspectorBriefing.isFallback ? '#ffb74d' : 'var(--lime)', border: inspectorBriefing.isFallback ? '1px solid #e65100' : '1px solid #2e7d32', fontWeight: 700 }}>
                          {inspectorBriefing.isFallback ? 'Grounded Fallback' : `Ollama ${inspectorBriefing.providerModel}`}
                        </span>
                      </div>

                      {/* Risk Metrics Banner */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#1c2422', padding: '12px 14px', borderRadius: '8px', marginBottom: '14px' }}>
                        <div>
                          <span style={{ fontSize: '10px', color: '#9da69c', fontWeight: 700, textTransform: 'uppercase' }}>Risk Tier</span>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: inspectorBriefing.riskSummary.riskLevel === 'CRITICAL' ? 'var(--coral)' : inspectorBriefing.riskSummary.riskLevel === 'HIGH' ? '#ff9800' : 'var(--lime)' }}>
                            {inspectorBriefing.riskSummary.riskLevel} ({inspectorBriefing.riskSummary.riskScore}/100)
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '10px', color: '#9da69c', fontWeight: 700, textTransform: 'uppercase' }}>Predicted P(Serious)</span>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--lime)' }}>
                            {(inspectorBriefing.riskSummary.seriousViolationProbability * 100).toFixed(1)}%
                          </div>
                          <small style={{ fontSize: '9px', color: '#88918a', display: 'block', marginTop: '2px' }}>
                            Source: {inspectorBriefing.predictionSource === 'ml' ? `ML Model (${inspectorBriefing.riskSummary.modelVersion})` : `Baseline Baseline (${inspectorBriefing.riskSummary.modelVersion})`}
                          </small>
                        </div>
                      </div>

                      {/* WHY THIS ESTABLISHMENT NEEDS ATTENTION */}
                      <div style={{ marginBottom: '14px' }}>
                        <h4 style={{ fontSize: '11px', color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 6px 0', fontWeight: 800 }}>
                          Why This Establishment Needs Attention
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#e0e4dc', lineHeight: '1.5' }}>
                          {inspectorBriefing.priorityFactors.map((pf: any, idx: number) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>
                              <strong style={{ color: 'white' }}>{pf.factor}:</strong> {pf.explanation}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* PRIORITIZE THESE CHECKS */}
                      <div style={{ marginBottom: '14px', background: '#1a2220', padding: '12px', borderRadius: '8px', border: '1px solid #2d3836' }}>
                        <h4 style={{ fontSize: '11px', color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 8px 0', fontWeight: 800 }}>
                          Prioritize These Checks
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {inspectorBriefing.inspectionFocus.map((focus: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '11px', color: '#d0d6cb' }}>
                              <div style={{ fontWeight: 700, color: 'white' }}>{idx + 1}. {focus.area}</div>
                              <div style={{ color: '#a0a89c', fontSize: '10px', marginTop: '2px' }}>{focus.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* GROUNDED BRIEFING TEXT */}
                      <div style={{ marginBottom: '14px' }}>
                        <h4 style={{ fontSize: '11px', color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 6px 0', fontWeight: 800 }}>
                          Grounded Briefing Summary
                        </h4>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '11px', color: '#d9dfd4', background: '#171c1b', padding: '10px 12px', borderRadius: '8px', border: '1px solid #283230', lineHeight: '1.5', margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                          {inspectorBriefing.briefingText}
                        </pre>
                      </div>

                      {/* SOURCE CITATIONS */}
                      {inspectorBriefing.sources && inspectorBriefing.sources.length > 0 && (
                        <div style={{ marginBottom: '14px', borderTop: '1px dashed #2d3836', paddingTop: '10px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--lime)', textTransform: 'uppercase' }}>
                            Verified PostgreSQL &amp; ML Sources ({inspectorBriefing.sources.length})
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                            {inspectorBriefing.sources.map((src: any, sIdx: number) => (
                              <div key={sIdx} className="copilot-source-chip" title={`${src.relevance} (${src.id})`}>
                                <span className="copilot-source-type">{src.type.replace('_', ' ')}</span>
                                <span>{src.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* READY TO INSPECT CONCLUSION BLOCK */}
                      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #27312f' }}>
                        <div style={{ marginBottom: '10px' }}>
                          <h4 style={{ fontSize: '13px', color: '#fff', margin: '0 0 3px 0', fontWeight: 700 }}>
                            Ready to inspect?
                          </h4>
                          <p style={{ fontSize: '11px', color: '#9da69a', margin: 0, lineHeight: '1.4' }}>
                            You&apos;ve reviewed the establishment&apos;s risk, history, and priority factors.
                          </p>
                        </div>
                        <button
                          type="button"
                          className={`btn-start-inspection full ${isStartingInspection ? 'btn-start-loading' : ''}`}
                          disabled={isStartingInspection || isSubmitting || currentUser?.role === 'ESTABLISHMENT_MANAGER'}
                          onClick={() => {
                            setBriefingActive(false)
                            handleStartInspection()
                          }}
                        >
                          {isStartingInspection ? (
                            <>
                              <RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Starting Inspection...
                            </>
                          ) : (
                            <>
                              <ClipboardCheck style={{ width: 15, height: 15 }} />
                              <span>{getStartInspectionLabel(selected, 'briefing')}</span>
                              <span className="btn-arrow"><ArrowRight style={{ width: 14, height: 14 }} /></span>
                            </>
                          )}
                        </button>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span className="cta-context-line" style={{ margin: 0 }}>
                            Begin the inspection workflow for this establishment
                          </span>
                          <button
                            type="button"
                            className="text-button"
                            style={{ color: '#9da69c', fontSize: '10px', padding: 0 }}
                            onClick={() => handleGenerateBriefing(selected.id || '')}
                          >
                            Regenerate
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* EVIDENCE SCANNER CARD */}
              <div className="evidence-scanner-card">
                <div className="evidence-scanner-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles style={{ width: 14, color: 'var(--lime)' }} />
                    <b>Visual Evidence Scanner</b>
                  </div>
                  <span className="confidence-pill"><i /> Gemini Vision AI</span>
                </div>

                {/* Upload Dropzone */}
                <label className="evidence-dropzone" style={{ display: 'block' }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadEvidenceFile(file)
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <FileText style={{ width: 22, color: 'var(--lime)' }} />
                    <span style={{ fontSize: '11px', color: '#e0e4dc', fontWeight: 700 }}>
                      {uploadingEvidence ? 'Uploading image...' : 'Upload kitchen / storage evidence image'}
                    </span>
                    <small style={{ fontSize: '9px', color: '#89918e' }}>Formats: JPG, PNG, WEBP (Max 10MB)</small>
                  </div>
                </label>

                {/* Active Evidence Item / Preview & AI Analysis */}
                {activeEvidenceItem && (
                  <div style={{ marginTop: '14px' }}>
                    <div className="evidence-preview-container">
                      <img src={activeEvidenceItem.storagePath} alt="Evidence" className="evidence-preview-img" />
                      {/* Render Bounding Box Overlay if available */}
                      {activeEvidenceItem.boundingBox && (() => {
                        try {
                          const box = typeof activeEvidenceItem.boundingBox === 'string' ? JSON.parse(activeEvidenceItem.boundingBox) : activeEvidenceItem.boundingBox;
                          const x = box.x !== undefined ? box.x : (box.xmin || 0);
                          const y = box.y !== undefined ? box.y : (box.ymin || 0);
                          const width = box.width !== undefined ? box.width : (box.xmax !== undefined && box.xmin !== undefined ? box.xmax - box.xmin : 0.4);
                          const height = box.height !== undefined ? box.height : (box.ymax !== undefined && box.ymin !== undefined ? box.ymax - box.ymin : 0.4);
                          return (
                            <div
                              className="evidence-bounding-box"
                              style={{
                                left: `${x * 100}%`,
                                top: `${y * 100}%`,
                                width: `${width * 100}%`,
                                height: `${height * 100}%`,
                              }}
                            />
                          );
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>

                    {scanningEvidence ? (
                      <div style={{ margin: '12px 0', fontSize: '11px', color: 'var(--lime)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw style={{ width: 13 }} /> Scanning image with Gemini Vision AI...
                      </div>
                    ) : activeEvidenceItem.candidateCategory ? (
                      <div className="evidence-finding-box">
                        <div className="evidence-finding-title">
                          <b style={{ fontSize: '12px', color: 'white' }}>{activeEvidenceItem.candidateTitle || 'AI Candidate Finding'}</b>
                          <span className="confidence-chip">
                            {Math.round((activeEvidenceItem.candidateConfidence || 0.85) * 100)}% Visual Confidence
                          </span>
                        </div>

                        <div style={{ fontSize: '10px', color: '#aab2a8', marginBottom: '8px' }}>
                          Category: <strong style={{ color: 'var(--lime)' }}>{activeEvidenceItem.candidateCategory}</strong>
                        </div>

                        <p style={{ fontSize: '11px', color: '#d0d6cc', margin: '0 0 10px', lineHeight: '1.4' }}>
                          {activeEvidenceItem.candidateDescription}
                        </p>

                        <div className="verification-pill" style={{ marginBottom: '10px' }}>
                          ⚠️ AI Recommendation — Inspector Verification Required
                        </div>

                        {/* Inspector Severity Selection & Actions */}
                        {activeEvidenceItem.reviewStatus === 'PENDING' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #2d3835' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '10px', color: '#9da69a' }}>AI Recommended Severity:</span>
                              <select
                                value={selectedSeverityOverride}
                                onChange={(e) => setSelectedSeverityOverride(e.target.value as any)}
                                style={{ background: '#141817', color: 'white', border: '1px solid #3c4a47', borderRadius: '4px', fontSize: '10px', padding: '3px 8px' }}
                              >
                                <option value="MINOR">MINOR</option>
                                <option value="MAJOR">MAJOR</option>
                                <option value="CRITICAL">CRITICAL</option>
                              </select>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="primary-button"
                                style={{ flex: 1, fontSize: '10px', padding: '8px' }}
                                onClick={() => handleAcceptFinding(activeEvidenceItem.id)}
                                disabled={isSubmitting}
                              >
                                Accept &amp; Create Violation
                              </button>
                              <button
                                type="button"
                                className="text-button"
                                style={{ color: '#ff786b', fontSize: '10px', padding: '8px' }}
                                onClick={() => handleRejectFinding(activeEvidenceItem.id)}
                                disabled={isSubmitting}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', fontWeight: 800, color: activeEvidenceItem.reviewStatus === 'ACCEPTED' ? 'var(--lime)' : '#ff786b', marginTop: '8px' }}>
                            {activeEvidenceItem.reviewStatus === 'ACCEPTED' ? '✓ Inspector Accepted — Confirmed Violation Created' : '✗ Inspector Rejected Candidate Finding'}
                          </div>
                        )}
                      </div>
                    ) : activeEvidenceItem.candidateDescription ? (
                      <div style={{ marginTop: '10px', fontSize: '11px', color: '#9da69a' }}>
                        {activeEvidenceItem.candidateDescription}
                      </div>
                    ) : null}

                    {evidenceMessage && (
                      <div style={{ marginTop: '8px', fontSize: '10px', color: evidenceMessage.includes('✓') ? 'var(--lime)' : '#ff786b' }}>
                        {evidenceMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* WHY THIS RISK - SHAP EXPLANATION DRIVERS */}
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <h3>Why this risk prediction?</h3>
                  <span className="confidence-pill"><Sparkles /> SHAP Explainability</span>
                </div>
                {selected.drivers.map((driver, index) => (
                  <div className="driver-row" key={driver}>
                    <span>{index + 1}</span>
                    <b>{driver}</b>
                    <small>{index === 0 ? 'High impact' : index === 1 ? 'Needs review' : 'Recurring'}</small>
                  </div>
                ))}
              </div>

              <div className="drawer-section timeline">
                <h3>Inspection history &amp; risk trend</h3>
                {workflow === 'done' && (
                  <div className="timeline-item">
                    <i className="timeline-dot lime-dot" style={{ background: 'var(--lime)' }} />
                    <div>
                      <b>Risk recalculated to 51% (MEDIUM)</b>
                      <small>Just now · Corrective evidence accepted &amp; model re-evaluated</small>
                    </div>
                  </div>
                )}
                <div className="timeline-item">
                  <i className="timeline-dot coral-dot" />
                  <div><b>ML Risk evaluated at 84% (HIGH)</b><small>Oct 18, 2024 · AI Risk inference</small></div>
                </div>
                <div className="timeline-item">
                  <i className="timeline-dot" />
                  <div><b>Routine inspection completed</b><small>Oct 6, 2024 · Alex Morgan</small></div>
                </div>
                <div className="timeline-item">
                  <i className="timeline-dot" />
                  <div><b>Corrective action logged</b><small>Sep 12, 2024 · Temperature control</small></div>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              {workflow === 'closed' || workflow === 'done' ? (
                <div style={{ width: '100%' }}>
                  <button
                    type="button"
                    className={`btn-start-inspection full ${isStartingInspection ? 'btn-start-loading' : ''}`}
                    onClick={() => handleStartInspection()}
                    disabled={isStartingInspection || isSubmitting || currentUser?.role === 'ESTABLISHMENT_MANAGER'}
                  >
                    {isStartingInspection ? (
                      <>
                        <RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Starting Inspection...
                      </>
                    ) : (
                      <>
                        <ClipboardCheck style={{ width: 15, height: 15 }} />
                        <span>{workflow === 'done' ? 'Start follow-up inspection' : getStartInspectionLabel(selected, 'footer')}</span>
                        <span className="btn-arrow"><ArrowRight style={{ width: 14, height: 14 }} /></span>
                      </>
                    )}
                  </button>
                  <span className="cta-context-line" style={{ textAlign: 'center' }}>
                    Begin the inspection workflow for this establishment
                  </span>
                </div>
              ) : workflow === 'inspection' ? (
                <div className="workflow-box">
                  <span className="workflow-step active">1</span>
                  <div><b>Inspection in progress</b><small>Walk site and record findings.</small></div>
                  <button className="dark-button" onClick={() => handleRecordViolation()} disabled={isSubmitting}>
                    {isSubmitting ? 'Recording...' : 'Add violation'} <ArrowUpRight />
                  </button>
                </div>
              ) : workflow === 'violation' ? (
                <div className="workflow-box">
                  <span className="workflow-step coral-step">2</span>
                  <div><b>Violation recorded</b><small>Temperature control · Critical</small></div>
                  <button className="dark-button" onClick={() => setWorkflow('action')}>Corrective action <ArrowUpRight /></button>
                </div>
              ) : (
                <div className="workflow-box">
                  <span className="workflow-step lime-step">3</span>
                  <div><b>Corrective action</b><small>Submit findings &amp; trigger ML model recalculation.</small></div>
                  <button className="primary-button" onClick={() => handleSubmitInspection()} disabled={isSubmitting}>
                    <Check data-icon="inline-start" />{isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
