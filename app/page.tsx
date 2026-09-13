'use client'

import { useMemo, useState } from 'react'
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
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  X,
} from 'lucide-react'

type Establishment = {
  name: string
  type: string
  area: string
  score: number
  delta: string
  status: 'Critical' | 'Watch' | 'Stable'
  lastInspection: string
  drivers: string[]
}

const establishments: Establishment[] = [
  { name: 'Central Spice', type: 'Restaurant', area: 'Mission District', score: 82, delta: '+14', status: 'Critical', lastInspection: '18 days ago', drivers: ['Cold chain gaps', 'Pest activity', 'Repeat violations'] },
  { name: 'Marina Market', type: 'Grocery', area: 'Marina', score: 67, delta: '+8', status: 'Watch', lastInspection: '9 days ago', drivers: ['Temperature logs', 'Food labeling'] },
  { name: 'Golden Crust Bakery', type: 'Bakery', area: 'SoMa', score: 41, delta: '-6', status: 'Stable', lastInspection: '2 days ago', drivers: ['Sanitation'] },
  { name: 'Harbor House', type: 'Restaurant', area: 'North Beach', score: 58, delta: '+3', status: 'Watch', lastInspection: '24 days ago', drivers: ['Allergen controls'] },
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
  const [mobileNav, setMobileNav] = useState(false)

  const filtered = useMemo(() => establishments.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.area.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (filter === 'All' || item.status === filter)
  }), [search, filter])

  function openEstablishment(item: Establishment) {
    setSelected(item)
    setWorkflow('closed')
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark">L</span><span>looks<span>fine</span></span></div>
        <button className="org-switcher"><span className="org-avatar">SF</span><span><b>San Francisco</b><small>Public Health</small></span><ChevronDown data-icon="inline-end" /></button>
        <nav className="main-nav" aria-label="Primary navigation">
          <p className="eyebrow">Command center</p>
          {navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActiveNav(label); setMobileNav(false) }} className={activeNav === label ? 'nav-item active' : 'nav-item'}><Icon data-icon="inline-start" />{label}{label === 'Inspections' && <span className="nav-count">12</span>}</button>)}
          <p className="eyebrow nav-lower">Workspace</p>
          <button className="nav-item"><Bot data-icon="inline-start" />AI Copilot<span className="new-pill">NEW</span></button>
          <button className="nav-item"><Settings data-icon="inline-start" />Settings</button>
        </nav>
        <div className="sidebar-footer"><div className="user-avatar">AM</div><div><b>Alex Morgan</b><small>Health inspector</small></div><MoreHorizontal /></div>
      </aside>

      <section className="content-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu /></button><div className="breadcrumbs"><span>San Francisco</span><span>/</span><b>{activeNav}</b></div><div className="top-actions"><label className="search-box"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything" /><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="Notifications"><Bell /><i /></button><div className="mini-avatar">AM</div></div></header>

        <div className="page-wrap">
          <div className="page-heading"><div><p className="eyebrow">Tuesday, October 24, 2024 <span className="live-dot" /> Live intelligence</p><h1>Good morning, Alex<span className="accent-period">.</span></h1><p className="lede">Here&apos;s what needs your attention across the city today.</p></div><button className="primary-button" onClick={() => { setSelected(establishments[0]); setWorkflow('inspection') }}><ClipboardCheck data-icon="inline-start" />Start inspection</button></div>

          <div className="stat-grid"><div className="stat-card dark-card"><span className="stat-label">Open inspections</span><strong>12</strong><span className="stat-meta lime"><ArrowUpRight /> 4 from yesterday</span><div className="sparkline lime-line" /></div><div className="stat-card"><span className="stat-label">At-risk establishments</span><strong>08</strong><span className="stat-meta coral"><ArrowUpRight /> 2 this week</span><div className="sparkline coral-line" /></div><div className="stat-card"><span className="stat-label">City risk score</span><strong>46<span className="score-denom">/100</span></strong><span className="stat-meta lime"><ArrowDownRight /> 3 pts this month</span><div className="sparkline blue-line" /></div><div className="stat-card pattern-card"><div className="pattern-icon"><Sparkles /></div><span className="stat-label">New pattern detected</span><b>Cooling failures cluster around weekend deliveries.</b><button onClick={() => setActiveNav('Patterns')}>View pattern <ArrowUpRight /></button></div></div>

          <div className="section-row"><div><p className="eyebrow">Priority queue</p><h2>Needs your attention</h2></div><button className="text-button" onClick={() => setActiveNav('Inspections')}>View all inspections <ArrowUpRight /></button></div>
          <div className="attention-layout"><div className="queue-card">{filtered.slice(0, 3).map((item, index) => <button className="queue-row" key={item.name} onClick={() => openEstablishment(item)}><span className={`priority-number p-${index + 1}`}>0{index + 1}</span><span className="queue-main"><b>{item.name}</b><small>{item.type} <span>·</span> {item.area}</small></span><StatusBadge status={item.status} /><span className="queue-score">{item.score}<small> risk</small></span><ChevronDown className="row-arrow" /></button>)}</div><div className="copilot-card"><div className="copilot-top"><span className="copilot-orb"><Bot /></span><span><b>AI Copilot</b><small>Grounded in your records</small></span><span className="online-label"><i /> Online</span></div><p>&quot;Central Spice&apos;s risk increased <strong>14 points</strong> since the last visit. I found 3 related violations across the Mission District.&quot;</p><button className="dark-button" onClick={() => openEstablishment(establishments[0])}>Explore finding <ArrowUpRight /></button></div></div>

          <div className="section-row second"><div><p className="eyebrow">Portfolio overview</p><h2>Risk at a glance</h2></div><div className="filter-group">{(['All', 'Critical', 'Watch', 'Stable'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'filter-button active' : 'filter-button'}>{item}</button>)}</div></div>
          <div className="overview-grid"><div className="distribution-card"><div className="card-heading"><div><h3>Risk distribution</h3><p>Across 124 active establishments</p></div><MoreHorizontal /></div><div className="donut-wrap"><div className="donut"><div><strong>46</strong><small>avg. score</small></div></div><div className="legend"><span><i className="legend-coral" /> Critical <b>8</b></span><span><i className="legend-lime" /> Watch <b>31</b></span><span><i className="legend-blue" /> Stable <b>85</b></span></div></div><div className="distribution-footer"><span><ArrowDownRight /> 3.2% lower than last month</span><b>Good trend</b></div></div><div className="map-card"><div className="card-heading"><div><h3>Regional hotspots</h3><p>Risk concentration by neighborhood</p></div><button className="icon-button small"><MapPin /></button></div><div className="map-visual"><div className="map-grid" /><span className="map-label label-mission">Mission <b>82</b></span><span className="map-label label-marina">Marina <b>67</b></span><span className="map-label label-soma">SoMa <b>41</b></span><span className="map-label label-north">North Beach <b>58</b></span><div className="hotspot hotspot-one" /><div className="hotspot hotspot-two" /><div className="hotspot hotspot-three" /></div><div className="map-footer"><span><i className="hotspot-key" /> Higher concentration</span><button className="text-button">Open map <ArrowUpRight /></button></div></div><div className="trajectory-card"><div className="card-heading"><div><h3>Risk trajectory</h3><p>Citywide score · last 6 months</p></div><button className="icon-button small"><CalendarClock /></button></div><div className="trajectory-value"><strong>46</strong><span><ArrowDownRight /> 3 pts</span></div><div className="chart"><div className="chart-y"><span>70</span><span>50</span><span>30</span></div><svg viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label="Risk trajectory chart"><path className="chart-area" d="M0 25 C25 38 35 28 55 48 S90 38 110 70 S140 57 165 65 S195 78 215 69 S245 83 270 78 S300 94 320 88 L320 120 L0 120Z" /><path className="chart-line" d="M0 25 C25 38 35 28 55 48 S90 38 110 70 S140 57 165 65 S195 78 215 69 S245 83 270 78 S300 94 320 88" /></svg><div className="chart-x"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div></div></div></div>

          <div className="section-row second"><div><p className="eyebrow">Recent intelligence</p><h2>Patterns worth knowing</h2></div><button className="text-button" onClick={() => setActiveNav('Patterns')}>See all patterns <ArrowUpRight /></button></div>
          <div className="pattern-grid"><div className="intel-card featured"><span className="intel-tag"><Sparkles /> Emerging</span><h3>Weekend delivery cooling failures</h3><p>12 establishments show a temperature deviation within 48 hours of a weekend delivery.</p><div className="intel-bottom"><span>Confidence <b>87%</b></span><span>12 signals</span></div></div><div className="intel-card"><span className="intel-tag coral-tag"><Flame /> Recurring</span><h3>Handwashing violations</h3><p>Most common repeat issue in quick-service restaurants.</p><div className="intel-bottom"><span>Confidence <b>94%</b></span><span>28 signals</span></div></div><div className="intel-card action-card"><span className="intel-tag blue-tag"><ShieldCheck /> Recommended</span><h3>Schedule a focused sweep</h3><p>Mission District has 3x the city average for repeat violations.</p><button onClick={() => setActiveNav('Inspections')}>Build inspection route <ArrowUpRight /></button></div></div>

          <footer className="page-footer"><span><span className="brand-mark small-mark">L</span> looksfine <i /> Data refreshed 2 minutes ago</span><span>Demo workspace · All data is illustrative</span></footer>
        </div>
      </section>

      {selected && <div className="drawer-backdrop" onClick={() => setSelected(null)}><aside className="detail-drawer" onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={() => setSelected(null)} aria-label="Close details"><X /></button><div className="drawer-header"><span className="drawer-kicker">Establishment profile</span><h2>{selected.name}</h2><p><Store /> {selected.type} <span>·</span> <MapPin /> {selected.area}</p><div className="drawer-score"><ScoreRing score={workflow === 'done' ? selected.score - 8 : selected.score} /><div><StatusBadge status={workflow === 'done' ? 'Watch' : selected.status} /><span>Last inspected {selected.lastInspection}</span></div></div></div><div className="drawer-body"><div className="drawer-section"><div className="drawer-section-title"><h3>Why this is flagged</h3><span className="confidence-pill"><Sparkles /> 91% confidence</span></div>{selected.drivers.map((driver, index) => <div className="driver-row" key={driver}><span>{index + 1}</span><b>{driver}</b><small>{index === 0 ? 'High impact' : index === 1 ? 'Needs review' : 'Recurring'}</small></div>)}</div><div className="drawer-section timeline"><h3>Inspection history</h3><div className="timeline-item"><i className="timeline-dot coral-dot" /><div><b>Risk score increased to 82</b><small>Oct 18, 2024 · Automated signal</small></div></div><div className="timeline-item"><i className="timeline-dot" /><div><b>Routine inspection completed</b><small>Oct 6, 2024 · Alex Morgan</small></div></div><div className="timeline-item"><i className="timeline-dot" /><div><b>Corrective action closed</b><small>Sep 12, 2024 · Manager verified</small></div></div></div></div><div className="drawer-footer">{workflow === 'closed' || workflow === 'done' ? <button className="primary-button full" onClick={() => setWorkflow('inspection')}><ClipboardCheck data-icon="inline-start" />{workflow === 'done' ? 'Start follow-up inspection' : 'Start inspection'}</button> : workflow === 'inspection' ? <div className="workflow-box"><span className="workflow-step active">1</span><div><b>Inspection in progress</b><small>Walk the site and record findings.</small></div><button className="dark-button" onClick={() => setWorkflow('violation')}>Add violation <ArrowUpRight /></button></div> : workflow === 'violation' ? <div className="workflow-box"><span className="workflow-step coral-step">2</span><div><b>Violation recorded</b><small>Temperature control · Critical</small></div><button className="dark-button" onClick={() => setWorkflow('action')}>Corrective action <ArrowUpRight /></button></div> : <div className="workflow-box"><span className="workflow-step lime-step">3</span><div><b>Corrective action</b><small>Assign a follow-up and submit.</small></div><button className="primary-button" onClick={() => setWorkflow('done')}><Check data-icon="inline-start" />Submit</button></div>}</div></aside></div>}
    </main>
  )
}
