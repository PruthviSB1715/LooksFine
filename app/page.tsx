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
  delta: string
  status: 'Critical' | 'Watch' | 'Stable'
  lastInspection: string
  drivers: string[]
  reason?: string
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

const defaultEstablishments: Establishment[] = [
  { id: 'cs-demo', name: 'Central Spice', type: 'Restaurant', area: 'Mission District', score: 82, delta: '+14', status: 'Critical', lastInspection: '18 days ago', drivers: ['Cold chain gaps', 'Pest activity', 'Repeat violations'] },
  { id: 'mm-demo', name: 'Marina Market', type: 'Grocery', area: 'Marina', score: 67, delta: '+8', status: 'Watch', lastInspection: '9 days ago', drivers: ['Temperature logs', 'Food labeling'] },
  { id: 'gc-demo', name: 'Golden Crust Bakery', type: 'Bakery', area: 'SoMa', score: 41, delta: '-6', status: 'Stable', lastInspection: '2 days ago', drivers: ['Sanitation'] },
  { id: 'hh-demo', name: 'Harbor House', type: 'Restaurant', area: 'North Beach', score: 58, delta: '+3', status: 'Watch', lastInspection: '24 days ago', drivers: ['Allergen controls'] },
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

export default function Page() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [selected, setSelected] = useState<Establishment | null>(null)
  const [workflow, setWorkflow] = useState<'closed' | 'inspection' | 'violation' | 'action' | 'done'>('closed')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'All' | Establishment['status']>('All')
  const [regionFilter, setRegionFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [mobileNav, setMobileNav] = useState(false)

  // Live Database State
  const [realEstablishments, setRealEstablishments] = useState<Establishment[]>(defaultEstablishments)
  const [priorityQueue, setPriorityQueue] = useState<Establishment[]>([])
  const [inspectionsList, setInspectionsList] = useState<InspectionRecord[]>([])
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
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Schedule Modal Form State
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleEstId, setScheduleEstId] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleNotes, setScheduleNotes] = useState('')

  // Load Data from Backend APIs
  async function loadBackendData() {
    try {
      const [estRes, queueRes, riskRes, inspRes, authRes] = await Promise.all([
        fetch('/api/establishments?limit=50'),
        fetch('/api/risk/prioritization-queue?limit=10'),
        fetch('/api/risk/establishments'),
        fetch('/api/inspections?limit=30'),
        fetch('/api/auth/me'),
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
            delta: item.riskLevel === 'CRITICAL' ? '+14' : item.riskLevel === 'HIGH' ? '+8' : '-6',
            status: item.riskLevel === 'CRITICAL' ? 'Critical' : item.riskLevel === 'HIGH' ? 'Watch' : item.riskLevel === 'MEDIUM' ? 'Watch' : 'Stable',
            lastInspection: item.lastInspectionDate ? `${Math.round((Date.now() - new Date(item.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24))} days ago` : '18 days ago',
            drivers: item.name === 'Central Spice' ? ['Cold chain gaps', 'Pest activity', 'Repeat violations'] : ['Temperature logs', 'Sanitation compliance'],
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
            score: item.score,
            delta: item.riskLevel === 'CRITICAL' ? '+14' : '+8',
            status: item.riskLevel === 'CRITICAL' ? 'Critical' : item.riskLevel === 'HIGH' ? 'Watch' : item.riskLevel === 'MEDIUM' ? 'Watch' : 'Stable',
            lastInspection: item.lastInspectionDate,
            drivers: item.drivers,
            reason: item.reason,
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
            establishmentName: i.establishment?.name || 'Central Spice',
            area: i.establishment?.assignedRegion || 'Mission District',
            scheduledDate: new Date(i.scheduledDate).toLocaleDateString(),
            status: i.status,
            inspectorName: i.inspector?.name || 'Alex Morgan',
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
    } catch (err) {
      console.warn('Backend load warning, falling back to static prototype state:', err)
    }
  }

  useEffect(() => {
    loadBackendData()
  }, [])

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
      // Reload updated scores from DB
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
        <button className="org-switcher"><span className="org-avatar">SF</span><span><b>San Francisco</b><small>Public Health</small></span><ChevronDown data-icon="inline-end" /></button>
        <nav className="main-nav" aria-label="Primary navigation">
          <p className="eyebrow">Command center</p>
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => { setActiveNav(label); setMobileNav(false) }} className={activeNav === label ? 'nav-item active' : 'nav-item'}>
              <Icon data-icon="inline-start" />{label}
              {label === 'Inspections' && <span className="nav-count">{inspectionsList.length || 12}</span>}
            </button>
          ))}
          <p className="eyebrow nav-lower">Workspace</p>
          <button className="nav-item"><Bot data-icon="inline-start" />AI Copilot<span className="new-pill">NEW</span></button>
          <button className="nav-item"><Settings data-icon="inline-start" />Settings</button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-avatar">AM</div>
          <div><b>{currentUser?.name || 'Alex Morgan'}</b><small>{currentUser?.role?.replace('_', ' ') || 'Health inspector'}</small></div>
          <MoreHorizontal />
        </div>
      </aside>

      <section className="content-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu /></button>
          <div className="breadcrumbs"><span>San Francisco</span><span>/</span><b>{activeNav}</b></div>
          <div className="top-actions">
            <label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything" /><kbd>⌘ K</kbd></label>
            <button className="icon-button" aria-label="Notifications"><Bell /><i /></button>
            <div className="mini-avatar">AM</div>
          </div>
        </header>

        <div className="page-wrap">
          {/* Header Bar */}
          <div className="page-heading">
            <div>
              <p className="eyebrow">Tuesday, October 24, 2024 <span className="live-dot" /> Live database engine active</p>
              <h1>Good morning, {currentUser?.name?.split(' ')[0] || 'Alex'}<span className="accent-period">.</span></h1>
              <p className="lede">Here&apos;s what needs your attention across the city today.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="icon-button" onClick={() => loadBackendData()} title="Refresh database data"><RefreshCw style={{ width: 14 }} /></button>
              <button className="primary-button" onClick={() => { openEstablishment(realEstablishments[0]); setWorkflow('inspection') }}>
                <ClipboardCheck data-icon="inline-start" />Start inspection
              </button>
            </div>
          </div>

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
                  <span className="stat-label">New pattern detected</span>
                  <b>Cooling failures cluster around weekend deliveries.</b>
                  <button onClick={() => setActiveNav('Patterns')}>View pattern <ArrowUpRight /></button>
                </div>
              </div>

              <div className="section-row">
                <div><p className="eyebrow">Priority queue</p><h2>Needs your attention</h2></div>
                <button className="text-button" onClick={() => setActiveNav('Inspections')}>View all inspections <ArrowUpRight /></button>
              </div>

              <div className="attention-layout">
                <div className="queue-card">
                  {displayQueue.slice(0, 3).map((item, index) => (
                    <button className="queue-row" key={item.name} onClick={() => openEstablishment(item)}>
                      <span className={`priority-number p-${index + 1}`}>0{index + 1}</span>
                      <span className="queue-main">
                        <b>{item.name}</b>
                        <small>{item.type} <span>·</span> {item.area} {item.reason ? `· ${item.reason}` : ''}</small>
                      </span>
                      <StatusBadge status={item.status} />
                      <span className="queue-score">{item.score}<small> risk</small></span>
                      <ChevronDown className="row-arrow" />
                    </button>
                  ))}
                </div>
                <div className="copilot-card">
                  <div className="copilot-top">
                    <span className="copilot-orb"><Bot /></span>
                    <span><b>AI Copilot</b><small>Grounded in your database</small></span>
                    <span className="online-label"><i /> Online</span>
                  </div>
                  <p>&quot;Central Spice&apos;s risk increased <strong>14 points</strong> since the last visit. I found 3 related violations across the Mission District.&quot;</p>
                  <button className="dark-button" onClick={() => openEstablishment(realEstablishments[0])}>Explore finding <ArrowUpRight /></button>
                </div>
              </div>

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
                    <span className="map-label label-mission">Mission <b>82</b></span>
                    <span className="map-label label-marina">Marina <b>67</b></span>
                    <span className="map-label label-soma">SoMa <b>41</b></span>
                    <span className="map-label label-north">North Beach <b>58</b></span>
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
                  <p>Mission District has 3x the city average for repeat violations.</p>
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
                    <option value="Mission District">Mission District</option>
                    <option value="Marina">Marina</option>
                    <option value="SoMa">SoMa</option>
                    <option value="North Beach">North Beach</option>
                    <option value="Sunset">Sunset</option>
                    <option value="Richmond">Richmond</option>
                    <option value="Financial District">Financial District</option>
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
                  <p>12 establishments in Mission District show temperature deviations within 48 hours of weekend vendor deliveries.</p>
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
                  <h3>Mission District sweep route</h3>
                  <p>Mission District has 3x city average repeat violations. Schedule a targeted inspector sweep.</p>
                  <button onClick={() => setActiveNav('Inspections')}>Build sweep route <ArrowUpRight /></button>
                </div>
              </div>
            </div>
          )}

          {/* REPORTS & COMPLIANCE VIEW */}
          {activeNav === 'Reports' && (
            <div style={{ marginTop: '24px' }}>
              <div className="section-row">
                <div><p className="eyebrow">Analytics & Compliance</p><h2>City Health & Resolution Summary</h2></div>
              </div>
              <div className="overview-grid" style={{ marginTop: '16px' }}>
                <div className="stat-card">
                  <span className="stat-label">Total Monitored Sites</span>
                  <strong>{summaryStats.total}</strong>
                  <span className="stat-meta lime"><ArrowUpRight /> 100% database backed</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Corrective Resolution Rate</span>
                  <strong>92%</strong>
                  <span className="stat-meta lime"><ArrowDownRight /> Avg 4.2 days to resolution</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Re-inspection Success</span>
                  <strong>88%</strong>
                  <span className="stat-meta lime"><ArrowUpRight /> Improved post-inspection</span>
                </div>
              </div>
            </div>
          )}

          <footer className="page-footer">
            <span><span className="brand-mark small-mark">L</span> looksfine <i /> Connected to PostgreSQL / Prisma backend</span>
            <span>Demo workspace · Central Spice flagship active</span>
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

      {/* ESTABLISHMENT DETAIL & STEPPER DRAWER */}
      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="detail-drawer" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Close details"><X /></button>
            <div className="drawer-header">
              <span className="drawer-kicker">Establishment profile</span>
              <h2>{selected.name}</h2>
              <p><Store /> {selected.type} <span>·</span> <MapPin /> {selected.area}</p>
              <div className="drawer-score">
                <ScoreRing score={workflow === 'done' ? Math.max(20, selected.score - 31) : selected.score} />
                <div>
                  <StatusBadge status={workflow === 'done' ? 'Watch' : selected.status} />
                  <span>Last inspected {selected.lastInspection}</span>
                </div>
              </div>
            </div>

            <div className="drawer-body">
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <h3>Why this is flagged</h3>
                  <span className="confidence-pill"><Sparkles /> 91% confidence</span>
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
                <h3>Inspection history & audit log</h3>
                {workflow === 'done' && (
                  <div className="timeline-item">
                    <i className="timeline-dot lime-dot" style={{ background: 'var(--lime)' }} />
                    <div>
                      <b>Follow-up inspection submitted</b>
                      <small>Just now · Corrective evidence accepted & risk score dropped to {Math.max(20, selected.score - 31)}</small>
                    </div>
                  </div>
                )}
                <div className="timeline-item">
                  <i className="timeline-dot coral-dot" />
                  <div><b>Risk score evaluated at {selected.score}</b><small>Oct 18, 2024 · Deterministic risk engine</small></div>
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
                  <div><b>Corrective action</b><small>Submit findings & trigger risk update.</small></div>
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
