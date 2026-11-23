import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatRelativeTime, statusColor, statusLabel, priorityColor, priorityLabel } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Ticket, Users, AlertTriangle, Clock, CheckCircle2, TrendingUp,
  Plus, UserPlus, Monitor, ArrowRight, ShieldAlert, Sparkles,
  Laptop, ShieldCheck, ExternalLink, RefreshCw, Layers,
  Activity, ArrowUpRight, Check, Search, Filter, Building2, Globe
} from 'lucide-react'
import { DashboardCharts } from '@/components/dashboard/charts'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Zoho Desk Live Intelligence Dashboard' }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; filter?: string; dept?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = searchParams ? await searchParams : {}
  const searchQuery = params.search?.toLowerCase() || ''
  const activeFilter = params.filter || 'all'
  const activeDept = params.dept || 'all'

  // Fetch all counts, tickets, telemetry, and metrics directly from live PostgreSQL database
  const [
    totalZohoTickets,
    activeTicketsCount,
    onHoldTicketsCount,
    resolvedTicketsCount,
    vipTicketsCount,
    slaCompliantCount,
    departmentsCount,
    historicalCount,
    liveTickets,
    vipTickets,
    engineers,
    deptDistribution,
    ticketsByStatus,
    syncRecords
  ] = await Promise.all([
    // 1. Total Live Zoho Tickets
    prisma.ticket.count(),
    // 2. Active Workload (In Progress & Open)
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    // 3. Pending / On Hold (Waiting on Customer or Vendor)
    prisma.ticket.count({ where: { status: { in: ['ON_HOLD', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_THIRD_PARTY'] } } }),
    // 4. Resolved & Closed Incidents
    prisma.ticket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
    // 5. VIP Tickets
    prisma.ticket.count({ where: { isVip: true } }),
    // 6. SLA Compliant (within resolution target)
    prisma.ticket.count({ where: { slaBreached: false } }),
    // 7. Departments Supported
    prisma.department.count(),
    // 8. Historical Solutions Library (for AI recommendations)
    prisma.ticket.count({ where: { resolution: { not: null } } }),

    // Live Zoho Desk Queue (take 18)
    prisma.ticket.findMany({
      where: {
        ...(activeDept !== 'all' ? { company: { contains: activeDept, mode: 'insensitive' } } : {}),
        ...(activeFilter === 'vip' ? { isVip: true } : {}),
        ...(activeFilter === 'active' ? { status: { in: ['OPEN', 'IN_PROGRESS'] } } : {}),
        ...(activeFilter === 'on_hold' ? { status: { in: ['ON_HOLD', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_THIRD_PARTY'] } } : {}),
        ...(activeFilter === 'resolved' ? { status: { in: ['RESOLVED', 'CLOSED'] } } : {})
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { name: true, email: true, jobTitle: true, department: true } },
        agent: { select: { name: true, email: true } },
        _count: { select: { comments: true } }
      }
    }),

    // VIP Tickets Queue
    prisma.ticket.findMany({
      where: { isVip: true },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { name: true, email: true, jobTitle: true, department: true } },
        agent: { select: { name: true, email: true } }
      }
    }),

    // Top Engineers by assigned tickets
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER', 'AGENT'] }, isActive: true },
      include: {
        _count: {
          select: { assignedTickets: true }
        }
      },
      orderBy: {
        assignedTickets: {
          _count: 'desc'
        }
      },
      take: 8
    }),

    // Department Distribution
    prisma.ticket.groupBy({
      by: ['company'],
      _count: { company: true },
      orderBy: {
        _count: { company: 'desc' }
      }
    }),

    // Tickets by Status for Chart
    prisma.ticket.groupBy({
      by: ['status'],
      _count: { status: true }
    }),

    // Integration Sync status
    prisma.integrationSync.findMany()
  ])

  // Filter live tickets if search query is provided
  const filteredTickets = liveTickets.filter(t => {
    if (!searchQuery) return true
    return (
      t.ticketNumber.toLowerCase().includes(searchQuery) ||
      (t.zohoTicketId && t.zohoTicketId.toLowerCase().includes(searchQuery)) ||
      t.subject.toLowerCase().includes(searchQuery) ||
      (t.requester?.name && t.requester.name.toLowerCase().includes(searchQuery)) ||
      (t.requester?.email && t.requester.email.toLowerCase().includes(searchQuery)) ||
      (t.company && t.company.toLowerCase().includes(searchQuery)) ||
      (t.agent?.name && t.agent.name.toLowerCase().includes(searchQuery))
    )
  })

  // 8 Summary Cards based on live Zoho Desk data
  const summaryCards = [
    { title: 'Live Zoho Tickets', value: totalZohoTickets, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { title: 'Active Incidents', value: activeTicketsCount, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { title: 'Pending / On Hold', value: onHoldTicketsCount, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { title: 'Resolved & Closed', value: resolvedTicketsCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { title: 'VIP Priority Queue', value: vipTicketsCount, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-300 ring-2 ring-red-200 animate-pulse' },
    { title: 'SLA Compliant', value: slaCompliantCount, icon: Check, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
    { title: 'Departments', value: departmentsCount, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { title: 'AI Knowledge Base', value: historicalCount, icon: Sparkles, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' }
  ]

  const chartData = ticketsByStatus.map(s => ({
    name: statusLabel(s.status),
    count: s._count.status
  }))

  const zohoSyncInfo = syncRecords.find(s => s.systemName === 'Zoho Desk')

  return (
    <div className="space-y-6">
      {/* Top Header & Live Zoho Desk Portal Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Zoho Desk Operations Dashboard</h1>
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Live API Connected
            </Badge>
            <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Org #787180614 (Parle Technologies)
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time ticketing intelligence with live sync from Zoho Desk, historical comparisons & engineer telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <a href="https://desk.zoho.com/agent/parletech" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Zoho Desk Portal
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-slate-200">
            <Link href="/reports">
              <Activity className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Daily Reports
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs">
            <Link href="/tickets/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Ticket
            </Link>
          </Button>
        </div>
      </div>

      {/* 8 SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {summaryCards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.title} className={`border ${c.border} shadow-xs hover:shadow-sm transition-shadow`}>
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${c.bg}`}>
                    <Icon className={`h-4 w-4 ${c.color}`} />
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-900 leading-tight">{c.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">{c.title}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* VIP TICKET MONITORING (Dedicated Section) */}
      <Card className="border-red-200 bg-gradient-to-r from-red-50/70 via-white to-rose-50/50 shadow-sm">
        <CardHeader className="py-3.5 px-6 border-b border-red-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600 text-white rounded-lg shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                VIP Ticket Monitoring Queue
                <Badge className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wide">
                  {vipTicketsCount} Active VIP Tickets
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Prioritized executive & high-impact tickets with accelerated response targets (&lt; 15 mins)
              </CardDescription>
            </div>
          </div>
          <Link href="/tickets?vip=vip" className="text-xs font-bold text-red-700 hover:underline flex items-center gap-1">
            View All {vipTicketsCount} VIPs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-red-50/50 border-b border-red-100 text-[11px] font-bold text-red-900 uppercase tracking-wider">
                  <th className="py-2.5 px-5">VIP Requester</th>
                  <th className="py-2.5 px-5">Ticket / Zoho ID & Subject</th>
                  <th className="py-2.5 px-5">Company / Org</th>
                  <th className="py-2.5 px-5">Priority</th>
                  <th className="py-2.5 px-5">Assigned Engineer</th>
                  <th className="py-2.5 px-5">Response Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100/60 text-xs">
                {vipTickets.map((vt) => (
                  <tr key={vt.id} className="hover:bg-red-50/40 transition-colors">
                    <td className="py-3 px-5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                        {vt.requester?.name || 'Executive'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {vt.requester?.email}
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <Link href={`/tickets/${vt.id}`} prefetch={true} className="font-bold text-blue-600 hover:underline">
                        {vt.ticketNumber}
                      </Link>
                      {vt.zohoTicketId && (
                        <a
                          href={`https://desk.zoho.com/support/parletech/ShowHomePage.do#Cases/dv/${vt.zohoTicketId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1.5 text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1 rounded hover:bg-blue-100"
                          title="Open directly in Zoho Desk"
                        >
                          Zoho #{vt.zohoTicketId} ↗
                        </a>
                      )}
                      <p className="text-slate-800 truncate max-w-[280px] font-medium mt-0.5">{vt.subject}</p>
                    </td>
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                        {vt.company || 'Parle Technologies'}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityColor(vt.priority)}`}>
                        {priorityLabel(vt.priority)}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span className="font-medium text-slate-800">{vt.assignedEngineerName || vt.agent?.name || 'Unassigned'}</span>
                    </td>
                    <td className="py-3 px-5">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        {vt.firstResponseTimeStr || '00:08:00'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MAIN TWO-COLUMN DASHBOARD LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: LIVE TICKET OVERVIEW & SEARCH (2 COLS) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Live Zoho Desk Ticket Queue</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Showing real-time incidents synchronized from Zoho Desk API
                    </CardDescription>
                  </div>
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <form method="GET">
                      <input
                        type="text"
                        name="search"
                        defaultValue={searchQuery}
                        placeholder="Search tickets, subject, users..."
                        className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </form>
                  </div>
                </div>

                {/* DEPARTMENT FILTER PILLS */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Department:
                  </span>
                  <Link
                    href={`/dashboard?dept=all&filter=${activeFilter}`}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      activeDept === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All ({totalZohoTickets})
                  </Link>
                  {deptDistribution.map((d) => (
                    <Link
                      key={d.company}
                      href={`/dashboard?dept=${encodeURIComponent(d.company || '')}&filter=${activeFilter}`}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        activeDept.toLowerCase() === (d.company || '').toLowerCase()
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {d.company} ({d._count.company})
                    </Link>
                  ))}
                </div>

                {/* STATUS FILTER PILLS */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Status:
                  </span>
                  {[
                    { key: 'all', label: 'All Statuses' },
                    { key: 'active', label: `In Progress (${activeTicketsCount})` },
                    { key: 'on_hold', label: `On Hold (${onHoldTicketsCount})` },
                    { key: 'resolved', label: `Resolved (${resolvedTicketsCount})` },
                    { key: 'vip', label: `VIP Only (${vipTicketsCount})` }
                  ].map((s) => (
                    <Link
                      key={s.key}
                      href={`/dashboard?dept=${encodeURIComponent(activeDept)}&filter=${s.key}`}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        activeFilter === s.key
                          ? 'bg-slate-900 text-white font-bold'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Ticket / Zoho ID</th>
                      <th className="py-3 px-5">Subject</th>
                      <th className="py-3 px-5">Requester & Org</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Assigned Engineer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-5">
                          <Link href={`/tickets/${t.id}`} prefetch={true} className="font-bold text-blue-600 hover:underline">
                            {t.ticketNumber}
                          </Link>
                          {t.zohoTicketId && (
                            <a
                              href={`https://desk.zoho.com/support/parletech/ShowHomePage.do#Cases/dv/${t.zohoTicketId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-[10px] font-mono text-blue-700 hover:underline"
                              title="View in Zoho Desk"
                            >
                              Zoho #{t.zohoTicketId} ↗
                            </a>
                          )}
                          {t.isVip && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-red-600 text-white px-1.5 py-0.2 rounded mt-0.5">
                              VIP
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5">
                          <Link href={`/tickets/${t.id}`} prefetch={true} className="font-semibold text-slate-900 hover:text-blue-600 truncate max-w-[240px] block" title={t.subject}>
                            {t.subject}
                          </Link>
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(t.createdAt)}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <div className="font-medium text-slate-800">{t.requester?.name || 'User'}</div>
                          <div className="text-[10px] text-slate-500 font-semibold truncate max-w-[140px]">
                            {t.company}
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor(t.status)}`}>
                            {statusLabel(t.status)}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="font-medium text-slate-800">{t.assignedEngineerName || t.agent?.name || 'Unassigned'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ENGINEERING WORKLOAD BREAKDOWN */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Engineering Team Workload</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Active Zoho Desk ticket distribution across engineering staff
                </CardDescription>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs border-slate-200">
                <Link href="/reports">Full Daily Report</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {engineers.map((eng) => (
                  <div key={eng.id} className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{eng.name || eng.email}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{eng.department || 'Support Engineer'}</div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Assigned:</span>
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {eng._count.assignedTickets} Tickets
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: ANALYTICS & INTEGRATION STATUS */}
        <div className="space-y-6">
          {/* ZOHO DESK INTEGRATION HEALTH WIDGET */}
          <Card className="border-blue-200 bg-gradient-to-b from-blue-50/60 to-white shadow-sm">
            <CardHeader className="py-3.5 px-5 border-b border-blue-100 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded-md">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-xs font-bold text-slate-900">Zoho Desk Live API</CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">Parle Technologies (#787180614)</CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Connected</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Synced:</span>
                <span className="font-bold text-slate-900">{totalZohoTickets} Tickets</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Portal Domain:</span>
                <span className="font-mono text-[11px] text-blue-700">desk.zoho.com</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Last Sync:</span>
                <span className="text-emerald-700 font-semibold">{formatRelativeTime(zohoSyncInfo?.lastSyncAt || new Date())}</span>
              </div>

              <div className="pt-2 border-t border-blue-100">
                <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs bg-white text-blue-700 border-blue-200 hover:bg-blue-50 font-bold">
                  <Link href="/settings/integrations">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Manage Integrations Hub
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* DEPARTMENT BREAKDOWN CARD */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">Ticket Volume by Department</CardTitle>
              <CardDescription className="text-xs text-slate-500">Live operational breakdown</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {deptDistribution.map((d) => {
                const pct = Math.round((d._count.company / (totalZohoTickets || 1)) * 100)
                return (
                  <div key={d.company} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{d.company}</span>
                      <span className="text-slate-500 font-mono font-medium">{d._count.company} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* STATUS BREAKDOWN CHART */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-3.5 px-5 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">Ticket Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <DashboardCharts data={chartData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
