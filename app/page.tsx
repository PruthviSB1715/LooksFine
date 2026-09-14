'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Command,
  FileText,
  Filter,
  Flame,
  LayoutDashboard,
  ListFilter,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  X,
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
  { id: 'cs-demo', name: 'Hotel Rajdhani', type: 'Hotel / Restaurant', area: 'Solapur', score: 82, probability: 0.84, delta: '+14', status: 'Critical', lastInspection: '18 days ago', drivers: ['Cold chain gaps (2 prior events)', 'Pest activity history', 'Previous corrective action failed'], modelVersion: 'risk-model-v1' },
  { id: 'mm-demo', name: 'Deccan Spice Kitchen', type: 'Restaurant', area: 'Pune', score: 67, probability: 0.67, delta: '+8', status: 'Watch', lastInspection: '9 days ago', drivers: ['Temperature logs', 'Food labeling compliance'], modelVersion: 'risk-model-v1' },
  { id: 'gc-demo', name: 'Panchavati Caterers', type: 'Catering', area: 'Nashik', score: 41, probability: 0.38, delta: '-6', status: 'Stable', lastInspection: '2 days ago', drivers: ['Sanitation compliance'], modelVersion: 'risk-model-v1' },
  { id: 'hh-demo', name: 'Hotel Annapurna', type: 'Hotel / Restaurant', area: 'Kolhapur', score: 58, probability: 0.58, delta: '+3', status: 'Watch', lastInspection: '24 days ago', drivers: ['Allergen controls'], modelVersion: 'risk-model-v1' },
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

export default function Page() {
  const [activeNav, setActiveNav] = useState('Overview')
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
  const [summaryStats, setSummaryStats] = useState({
    total: 124,
    atRisk: 8,
    avgScore: 46,
    openInspections: 12,
    criticalCount: 8,
    watchCount: 31,
    stableCount: 85,
  })
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; establishmentId?: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // Load Data from Backend & ML APIs
  async function loadBackendData() {
    try {
      const [estRes, queueRes, riskRes, inspRes, authRes, modelRes] = await Promise.all([
        fetch('/api/establishments?limit=50'),
        fetch('/api/risk/prioritization-queue?limit=10'),
        fetch('/api/risk/establishments'),
        fetch('/api/inspections?limit=30'),
        fetch('/api/auth/me'),
        fetch('/api/admin/model-info'),
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
          setSummaryStats({
            total: s.totalEstablishments || 124,
            atRisk: s.atRiskCount || 8,
            avgScore: s.averageRiskScore || 46,
            openInspections: 12,
            criticalCount: s.distribution?.CRITICAL || 8,
            watchCount: (s.distribution?.HIGH || 0) + (s.distribution?.MEDIUM || 0) || 31,
            stableCount: s.distribution?.LOW || 85,
          })
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
            inspectorName: i.inspector?.name || 'Rahul Patil',
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
  }, [])

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

  // Handle Inspection Stepper Workflow APIs
  async function handleStartInspection() {
    if (!selected) return
    setIsSubmitting(true)
    try {
      if (selected.id) {
        const res = await fetch(`/api/inspections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            establishmentId: selected.id,
            inspectorId: currentUser?.id || 'inspector-id',
            notes: 'Inspection initiated from Command Center',
          }),
        })
        if (res.ok) {
          const json = await res.json()
          setActiveInspectionId(json.data.id)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
      setWorkflow('violation')
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

  async function handleSubmitInspection() {
    if (!selected) return
    setIsSubmitting(true)
    try {
      if (activeInspectionId) {
        await fetch(`/api/inspections/${activeInspectionId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'SUBMIT', notes: 'Inspection completed and violations recorded.' }),
        })
      }
      // Reload updated scores & ML predictions from DB
      await loadBackendData()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
      setWorkflow('done')
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
        <div className="brand"><span className="brand-mark">L</span><span>looks<span>fine</span></span></div>
        <button className="org-switcher"><span className="org-avatar">MH</span><span><b>Maharashtra Authority</b><small>Food Safety — Demo</small></span><ChevronDown data-icon="inline-end" /></button>
        <nav className="main-nav" aria-label="Primary navigation">
          <p className="eyebrow">Command center</p>
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => { setActiveNav(label); setMobileNav(false) }} className={activeNav === label ? 'nav-item active' : 'nav-item'}>
              <Icon data-icon="inline-start" />{label}
              {label === 'Inspections' && <span className="nav-count">{inspectionsList.length || 12}</span>}
            </button>
          ))}
          <p className="eyebrow nav-lower">Workspace</p>
          <button className={activeNav === 'AI Copilot' ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveNav('AI Copilot'); setMobileNav(false) }}><Bot data-icon="inline-start" />AI Copilot<span className="new-pill">NEW</span></button>
          <button className="nav-item"><Settings data-icon="inline-start" />Settings</button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar">{currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : 'RP'}</div>
          <div><b>{currentUser?.name || 'Rahul Patil'}</b><small>{currentUser?.role ? currentUser.role.replace(/_/g, ' ') : 'FOOD SAFETY INSPECTOR'}</small></div>
          <MoreHorizontal />
        </div>
      </aside>

      <section className="content-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu /></button>
          <div className="breadcrumbs"><span>Maharashtra Food Safety Authority — Demo</span><span>/</span><b>{activeNav}</b></div>
          <div className="top-actions">
            <label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything" /><kbd>⌘ K</kbd></label>
            <button className="icon-button" aria-label="Notifications"><Bell /><i /></button>
            <div className="mini-avatar">{currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : 'RP'}</div>
          </div>
        </header>

        <div className="page-wrap">
          {/* Header Bar */}
          <div className="page-heading">
            <div>
              <p className="eyebrow">Tuesday, October 24, 2024 <span className="live-dot" /> ML Model Active (risk-model-v1)</p>
              <h1>Good morning, {currentUser?.name || 'Rahul Patil'}<span className="accent-period">.</span></h1>
              <p className="lede">Here&apos;s what needs your attention across Maharashtra today.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="icon-button" onClick={() => loadBackendData()} title="Refresh database & ML model predictions"><RefreshCw style={{ width: 14 }} /></button>
              <button className="primary-button" onClick={() => { openEstablishment(realEstablishments[0]); setWorkflow('inspection') }}>
                <ClipboardCheck data-icon="inline-start" />Start inspection
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
              <div className="stat-grid">
                <div className="stat-card dark-card">
                  <span className="stat-label">Open inspections</span>
                  <strong>{summaryStats.openInspections}</strong>
                  <span className="stat-meta lime"><ArrowUpRight /> 4 scheduled today</span>
                  <div className="sparkline lime-line" />
                </div>
                <div className="stat-card">
                  <span className="stat-label">At-risk establishments</span>
                  <strong>{summaryStats.atRisk < 10 ? `0${summaryStats.atRisk}` : summaryStats.atRisk}</strong>
                  <span className="stat-meta coral"><ArrowUpRight /> 2 this week</span>
                  <div className="sparkline coral-line" />
                </div>
                <div className="stat-card">
                  <span className="stat-label">City risk score</span>
                  <strong>{summaryStats.avgScore}<span className="score-denom">/100</span></strong>
                  <span className="stat-meta lime"><ArrowDownRight /> 3 pts this month</span>
                  <div className="sparkline blue-line" />
                </div>
                <div className="stat-card pattern-card">
                  <div className="pattern-icon"><Sparkles /></div>
                  <span className="stat-label">ML Model Active</span>
                  <b>Predicted P(serious violation) for high priority queue.</b>
                  <button onClick={() => setActiveNav('Reports')}>View ML stats <ArrowUpRight /></button>
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
                                {item.predictionSource === 'ml' ? `ML Model (${item.modelVersion})` : `Fallback Baseline (${item.modelVersion})`}
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="primary-button" style={{ fontSize: '11px', padding: '6px 12px', background: 'var(--lime)', color: 'var(--ink)' }} onClick={() => { openEstablishmentById(item.id); handleGenerateBriefing(item.id) }}>
                            <FileText style={{ width: 13, height: 13 }} /> Inspector Briefing
                          </button>
                          <button className="text-button" style={{ fontSize: '11px', color: '#1b5e20', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleAskCopilot(`Why should we inspect ${item.name} now?`, item.id)}>
                            <Bot style={{ width: 13, height: 13 }} /> Ask Copilot why <ArrowUpRight style={{ width: 12, height: 12 }} />
                          </button>
                          <button className="dark-button" style={{ fontSize: '11px', padding: '6px 14px' }} onClick={() => openEstablishmentById(item.id)}>
                            Open Intelligence <ArrowUpRight style={{ width: 12, height: 12 }} />
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

              <div className="section-row second">
                <div><p className="eyebrow">Recent intelligence</p><h2>Patterns worth knowing</h2></div>
                <button className="text-button" onClick={() => setActiveNav('Patterns')}>See all patterns <ArrowUpRight /></button>
              </div>

              <div className="pattern-grid">
                <div className="intel-card featured">
                  <span className="intel-tag"><Sparkles /> Emerging</span>
                  <h3>Weekend delivery cooling failures</h3>
                  <p>12 establishments show a temperature deviation within 48 hours of a weekend delivery.</p>
                  <div className="intel-bottom"><span>Confidence <b>87%</b></span><span>12 signals</span></div>
                </div>
                <div className="intel-card">
                  <span className="intel-tag coral-tag"><Flame /> Recurring</span>
                  <h3>Handwashing violations</h3>
                  <p>Most common repeat issue in quick-service restaurants.</p>
                  <div className="intel-bottom"><span>Confidence <b>94%</b></span><span>28 signals</span></div>
                </div>
                <div className="intel-card action-card">
                  <span className="intel-tag blue-tag"><ShieldCheck /> Recommended</span>
                  <h3>Schedule a focused sweep</h3>
                  <p>Solapur region has 3x the region average for repeat violations.</p>
                  <button onClick={() => setActiveNav('Inspections')}>Build inspection route <ArrowUpRight /></button>
                </div>
              </div>
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
            <div style={{ marginTop: '24px' }}>
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
              <div className="section-row">
                <div><p className="eyebrow">Pattern Intelligence</p><h2>Active Citywide Risk Signals</h2></div>
              </div>
              <div className="pattern-grid" style={{ marginTop: '16px' }}>
                <div className="intel-card featured">
                  <span className="intel-tag"><Sparkles /> Emerging</span>
                  <h3>Weekend delivery cooling failures</h3>
                  <p>12 establishments in Solapur show temperature deviations within 48 hours of weekend vendor deliveries.</p>
                  <div className="intel-bottom"><span>Confidence <b>87%</b></span><span>12 signals</span></div>
                </div>
                <div className="intel-card">
                  <span className="intel-tag coral-tag"><Flame /> Recurring</span>
                  <h3>Handwashing compliance gaps</h3>
                  <p>Most common repeat major issue across quick-service restaurants during peak lunch hours.</p>
                  <div className="intel-bottom"><span>Confidence <b>94%</b></span><span>28 signals</span></div>
                </div>
                <div className="intel-card action-card">
                  <span className="intel-tag blue-tag"><ShieldCheck /> Recommended</span>
                  <h3>Solapur sweep route</h3>
                  <p>Solapur region has 3x state average repeat violations. Schedule a targeted inspector sweep.</p>
                  <button onClick={() => setActiveNav('Inspections')}>Build sweep route <ArrowUpRight /></button>
                </div>
              </div>
            </div>
          )}

          {/* REPORTS & MODEL MONITORING VIEW */}
          {activeNav === 'Reports' && (
            <div style={{ marginTop: '24px' }}>
              <div className="section-row">
                <div><p className="eyebrow">ML Model Monitoring &amp; Metrics</p><h2>Model Governance: {modelInfo?.model_version || 'risk-model-v1'}</h2></div>
              </div>

              <div className="overview-grid" style={{ marginTop: '16px' }}>
                <div className="stat-card">
                  <span className="stat-label">Model Architecture</span>
                  <strong style={{ fontSize: '20px', fontFamily: 'Arial' }}>HistGradientBoosting</strong>
                  <span className="stat-meta lime"><ArrowUpRight /> scikit-learn GBDT Tabular</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">ROC-AUC Performance</span>
                  <strong>{(modelInfo?.evaluation_metrics.roc_auc || 0.8566).toFixed(4)}</strong>
                  <span className="stat-meta lime"><ArrowUpRight /> Test Set (360 samples)</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Precision / F1-Score</span>
                  <strong>{(modelInfo?.evaluation_metrics.f1_score || 0.8383).toFixed(4)}</strong>
                  <span className="stat-meta lime"><ArrowUpRight /> Target: P(serious violation)</span>
                </div>
              </div>

              <div className="queue-card" style={{ marginTop: '16px', padding: '20px' }}>
                <h3>ML Pipeline Governance Summary</h3>
                <p style={{ fontSize: '12px', color: '#555', lineHeight: '1.5' }}>
                  <b>Target Definition:</b> {modelInfo?.target_definition || 'P(serious food-safety violation at next inspection)'}<br />
                  <b>Leakage Prevention:</b> {modelInfo?.leakage_prevention || 'Strict temporal sequence split (features extracted <= Inspection N-1)'}<br />
                  <b>Training Dataset:</b> {modelInfo?.train_samples || 900} historical inspection events<br />
                  <b>Explainability:</b> Tree SHAP local feature importance mapping
                </p>
              </div>
            </div>
          )}

          <footer className="page-footer">
            <span><span className="brand-mark small-mark">L</span> looksfine <i /> Connected to ML Risk Engine (risk-model-v1) &amp; PostgreSQL</span>
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

      {/* ESTABLISHMENT DETAIL & STEPPER DRAWER WITH ML RISK INTELLIGENCE CARD */}
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
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button
                    type="button"
                    className="primary-button"
                    style={{ flex: 1, background: 'var(--lime)', color: 'var(--ink)', fontSize: '11px', fontWeight: 800 }}
                    onClick={() => handleGenerateBriefing(selected.id || '')}
                  >
                    <FileText style={{ width: 14 }} /> Inspector Briefing
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    style={{ flex: 1, background: '#1e2423', border: '1px solid var(--lime)', color: 'var(--lime)', fontSize: '11px' }}
                    onClick={() => handleEstablishmentCopilotAction(selected)}
                  >
                    <Bot style={{ width: 14 }} /> Ask Copilot
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

                      {/* START INSPECTION CTA */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #27312f' }}>
                        <button
                          type="button"
                          className="primary-button"
                          style={{ flex: 1, padding: '10px', fontSize: '11px', fontWeight: 800 }}
                          onClick={() => {
                            setBriefingActive(false)
                            handleStartInspection()
                          }}
                        >
                          <ClipboardCheck style={{ width: 14 }} /> Start Inspection
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          style={{ color: '#9da69c', fontSize: '10px' }}
                          onClick={() => handleGenerateBriefing(selected.id || '')}
                        >
                          Regenerate
                        </button>
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
                  <div><b>ML Risk evaluated at 84% (HIGH)</b><small>Oct 18, 2024 · risk-model-v1 inference</small></div>
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
                <button className="primary-button full" onClick={() => handleStartInspection()} disabled={isSubmitting}>
                  <ClipboardCheck data-icon="inline-start" />{workflow === 'done' ? 'Start follow-up inspection' : 'Start inspection'}
                </button>
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
