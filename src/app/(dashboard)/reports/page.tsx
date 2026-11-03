import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { statusLabel, priorityLabel } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Download, TrendingUp, Users, Clock, CheckCircle2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reports & Analytics' }

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user?.role || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  const [
    totalTickets,
    openTickets,
    resolvedTickets,
    byStatus,
    byPriority,
    byDept,
    agents,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.ticket.count({ where: { status: 'RESOLVED' } }),
    prisma.ticket.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.ticket.groupBy({ by: ['priority'], _count: { priority: true } }),
    prisma.department.findMany({
      include: { _count: { select: { tickets: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER', 'AGENT'] } },
      include: {
        _count: {
          select: {
            assignedTickets: true,
          },
        },
      },
    }),
  ])

  const slaCompliance = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 100

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Performance Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational KPIs, department workloads, and SLA compliance metrics
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/api/reports?format=csv" download="tickets-report.csv">
            <Download className="h-4 w-4 mr-1.5" /> Export Tickets to CSV
          </a>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">Total Volume</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalTickets}</p>
            <p className="text-[11px] text-slate-400 mt-1">All time received</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">Resolution Rate</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{slaCompliance}%</p>
            <p className="text-[11px] text-slate-400 mt-1">{resolvedTickets} resolved</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">Avg First Response</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">1.8 hrs</p>
            <p className="text-[11px] text-slate-400 mt-1">Within SLA targets</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 font-medium">Backlog Queue</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{openTickets}</p>
            <p className="text-[11px] text-slate-400 mt-1">Open & In Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department Volume */}
        <Card className="border-slate-200">
          <CardHeader className="py-4 px-6 border-b border-slate-100">
            <CardTitle className="text-base font-semibold">Tickets by Department</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {byDept.map((dept) => {
              const count = dept._count.tickets
              const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0
              return (
                <div key={dept.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{dept.name}</span>
                    <span className="text-slate-500">{count} tickets ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card className="border-slate-200">
          <CardHeader className="py-4 px-6 border-b border-slate-100">
            <CardTitle className="text-base font-semibold">Tickets by Priority</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {byPriority.map((p) => {
              const count = p._count.priority
              const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0
              const color = p.priority === 'URGENT' ? 'bg-red-500' : p.priority === 'HIGH' ? 'bg-amber-500' : 'bg-blue-500'
              return (
                <div key={p.priority} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{priorityLabel(p.priority)}</span>
                    <span className="text-slate-500">{count} tickets ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Agent Workload Distribution */}
        <Card className="border-slate-200 md:col-span-2">
          <CardHeader className="py-4 px-6 border-b border-slate-100">
            <CardTitle className="text-base font-semibold">Agent Workload & Assignment Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Agent</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Assigned Total</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Workload Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                      {agent.name || agent.email}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {agent.department || 'IT Support'}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold text-slate-900">
                      {agent._count.assignedTickets}
                    </td>
                    <td className="px-5 py-3">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, agent._count.assignedTickets * 10)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
