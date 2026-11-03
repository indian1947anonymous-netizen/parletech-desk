import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, statusColor, statusLabel, priorityColor, priorityLabel } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Ticket, Users, AlertTriangle, Clock, CheckCircle2, TrendingUp,
  Plus, UserPlus, Monitor, ArrowRight
} from 'lucide-react'
import { DashboardCharts } from '@/components/dashboard/charts'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let totalTickets = 0
  let openTickets = 0
  let unassignedTickets = 0
  let overdueTickets = 0
  let resolvedToday = 0
  let recentTickets: any[] = []
  let ticketsByStatus: any[] = []

  try {
    const results = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.ticket.count({ where: { status: 'OPEN', agentId: null } }),
      prisma.ticket.count({
        where: {
          status: { notIn: ['RESOLVED', 'CLOSED'] },
          slaResolutionDue: { lt: now },
        }
      }),
      prisma.ticket.count({
        where: { status: 'RESOLVED', resolvedAt: { gte: todayStart } }
      }),
      prisma.ticket.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { name: true, email: true } },
          customer: { select: { name: true, email: true } },
          agent: { select: { name: true } },
          department: { select: { name: true } },
        }
      }),
      prisma.ticket.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ])

    totalTickets = results[0]
    openTickets = results[1]
    unassignedTickets = results[2]
    overdueTickets = results[3]
    resolvedToday = results[4]
    recentTickets = results[5]
    ticketsByStatus = results[6]
  } catch (err) {
    console.error('Database connection error in dashboard:', err)
  }

  const stats = [
    { title: 'Total Tickets', value: totalTickets, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Open Tickets', value: openTickets, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Unassigned', value: unassignedTickets, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Overdue', value: overdueTickets, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Resolved Today', value: resolvedToday, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  ]

  const chartData = ticketsByStatus.map(s => ({
    name: statusLabel(s.status),
    count: s._count.status,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Welcome back, <span className="font-medium text-slate-800">{session.user.name || 'Agent'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/tickets/new">
              <Plus className="h-4 w-4 mr-1.5" /> Create Ticket
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 leading-tight">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-slate-100">
              <CardTitle className="text-base font-semibold">Recent Tickets</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs text-blue-600 hover:text-blue-700">
                <Link href="/tickets">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75">
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Requester</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <Link href={`/tickets/${ticket.id}`} className="group block">
                            <span className="font-semibold text-sm text-blue-600 group-hover:underline">
                              {ticket.ticketNumber}
                            </span>
                            <p className="text-xs text-slate-600 truncate max-w-[200px] sm:max-w-[260px] font-medium mt-0.5">
                              {ticket.subject}
                            </p>
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <p className="text-sm text-slate-800 font-medium">{ticket.requester?.name || ticket.customer?.name || 'External'}</p>
                          <p className="text-xs text-slate-400">{ticket.requester?.email || ticket.customer?.email || ''}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(ticket.status)}`}>
                            {statusLabel(ticket.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColor(ticket.priority)}`}>
                            {priorityLabel(ticket.priority)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <p className="text-xs text-slate-500">{formatDate(ticket.createdAt)}</p>
                        </td>
                      </tr>
                    ))}
                    {recentTickets.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                          No tickets found. Click "Create Ticket" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* Status Breakdown Chart */}
          <Card className="border-slate-200">
            <CardHeader className="py-4 px-6 border-b border-slate-100">
              <CardTitle className="text-base font-semibold">Tickets by Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DashboardCharts data={chartData} />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-slate-200">
            <CardHeader className="py-4 px-6 border-b border-slate-100">
              <CardTitle className="text-base font-semibold">IT Support Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Button variant="outline" className="w-full justify-start text-xs font-medium h-9" asChild>
                <Link href="/tickets/new"><Plus className="mr-2 h-4 w-4 text-blue-600" /> New Support Ticket</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs font-medium h-9" asChild>
                <Link href="/assets/new"><Monitor className="mr-2 h-4 w-4 text-emerald-600" /> Register IT Asset</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs font-medium h-9" asChild>
                <Link href="/customers/new"><UserPlus className="mr-2 h-4 w-4 text-indigo-600" /> Add Customer Contact</Link>
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs font-medium h-9" asChild>
                <Link href="/knowledge-base/new"><TrendingUp className="mr-2 h-4 w-4 text-amber-600" /> Publish KB Article</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
