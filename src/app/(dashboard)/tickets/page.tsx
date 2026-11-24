import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatRelativeTime, statusColor, statusLabel, priorityColor, priorityLabel, isOverdue } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TicketFilters } from '@/components/tickets/ticket-filters'
import { Plus, AlertTriangle, MessageSquare, ChevronLeft, ChevronRight, ShieldAlert, Clock, Laptop, ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'IT Tickets Queue' }

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    priority?: string
    department?: string
    agent?: string
    page?: string
    sort?: string
    vip?: string
    company?: string
    sla?: string
  }>
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const limit = 50
  const skip = (page - 1) * limit

  const where: any = {}

  // Role-based restrictions
  if (session.user.role === 'END_USER') {
    where.requesterId = session.user.id
  }

  // Global search across: Ticket ID, Requester name, Email, Company, Engineer, Device hostname, Asset tag, Subject, Error messages
  if (params.search) {
    const s = params.search.trim()
    where.OR = [
      { ticketNumber: { contains: s, mode: 'insensitive' } },
      { zohoTicketId: { contains: s, mode: 'insensitive' } },
      { subject: { contains: s, mode: 'insensitive' } },
      { description: { contains: s, mode: 'insensitive' } },
      { rootCause: { contains: s, mode: 'insensitive' } },
      { reportedSymptoms: { contains: s, mode: 'insensitive' } },
      { resolution: { contains: s, mode: 'insensitive' } },
      { deviceHostname: { contains: s, mode: 'insensitive' } },
      { assetTag: { contains: s, mode: 'insensitive' } },
      { company: { contains: s, mode: 'insensitive' } },
      { assignedEngineerName: { contains: s, mode: 'insensitive' } },
      { requester: { name: { contains: s, mode: 'insensitive' } } },
      { requester: { email: { contains: s, mode: 'insensitive' } } },
      { agent: { name: { contains: s, mode: 'insensitive' } } },
    ]
  }

  if (params.status && params.status !== 'all') where.status = params.status
  if (params.priority && params.priority !== 'all') where.priority = params.priority
  if (params.department && params.department !== 'all') {
    where.OR = [
      { departmentId: params.department },
      { company: { contains: params.department, mode: 'insensitive' } }
    ]
  }

  if (params.agent && params.agent !== 'all') {
    if (params.agent === 'unassigned') {
      where.assignedEngineerName = 'Unassigned'
    } else {
      where.OR = [
        { agentId: params.agent },
        { assignedEngineerName: { contains: params.agent, mode: 'insensitive' } }
      ]
    }
  }

  if (params.company && params.company !== 'all') where.company = { contains: params.company, mode: 'insensitive' }

  if (params.vip === 'vip') {
    where.isVip = true
  } else if (params.vip === 'standard') {
    where.isVip = false
  }

  if (params.sla === 'breached') {
    where.slaBreached = true
  } else if (params.sla === 'compliant') {
    where.slaBreached = false
  }

  // Sort order: VIP tickets prioritized, then by date or selected sort
  const orderBy: any = [
    { isVip: 'desc' }
  ]

  switch (params.sort) {
    case 'priority': orderBy.push({ priority: 'desc' }); break
    case 'updated': orderBy.push({ updatedAt: 'desc' }); break
    case 'oldest': orderBy.push({ createdAt: 'asc' }); break
    default: orderBy.push({ createdAt: 'desc' })
  }

  let tickets: any[] = []
  let total = 0
  let departments: any[] = []
  let agents: any[] = []

  try {
    const results = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          requester: { select: { name: true, email: true, jobTitle: true, department: true } },
          customer: { select: { name: true, email: true } },
          agent: { select: { name: true, email: true } },
          department: { select: { name: true } },
          _count: { select: { comments: true } },
        }
      }),
      prisma.ticket.count({ where }),
      prisma.department.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      prisma.user.findMany({
        where: { role: { in: ['AGENT', 'ADMIN', 'MANAGER'] }, isActive: true },
        select: { id: true, name: true }
      }),
    ])

    tickets = results[0]
    total = results[1]
    departments = results[2]
    agents = results[3]
  } catch (err) {
    console.error('Error fetching tickets:', err)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Zoho Desk Styled View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tickets Queue</h1>
            <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              {total} Total
            </span>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Zoho Desk Live
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time synchronization with Zoho Desk Organization #787180614
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
            <a href="https://desk.zoho.com/agent/parletech" target="_blank" rel="noopener noreferrer">
              Open Zoho Portal ↗
            </a>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
            <Link href="/tickets/new">
              <Plus className="h-3.5 w-3.5 mr-1" /> New Ticket
            </Link>
          </Button>
        </div>
      </div>

      {/* Zoho Desk Signature Quick Filters & Queue Tabs */}
      <TicketFilters departments={departments} agents={agents} />

      {/* Zoho Desk Clean Ticket Table */}
      <Card className="border-slate-200/90 shadow-xs overflow-hidden rounded-xl bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3 min-w-[260px]">Subject</th>
                  <th className="px-4 py-3 hidden md:table-cell">Requester</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Assigned Engineer</th>
                  <th className="px-4 py-3 hidden md:table-cell">Department</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 hidden sm:table-cell text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tickets.map((ticket) => {
                  const reqName = ticket.requester?.name || ticket.customer?.name || 'Customer'
                  const reqInitials = reqName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  const isUnassigned = !ticket.assignedEngineerName || ticket.assignedEngineerName === 'Unassigned'

                  return (
                    <tr
                      key={ticket.id}
                      className={`group transition-colors ${
                        ticket.isVip ? 'bg-red-50/20 hover:bg-red-50/40' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Ticket Number & ID */}
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/tickets/${ticket.id}`}
                            prefetch={true}
                            className="font-bold text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {ticket.ticketNumber}
                          </Link>
                          {ticket.isVip && (
                            <span className="text-[9px] font-black bg-red-600 text-white px-1 py-0.2 rounded" title="VIP Account">
                              VIP
                            </span>
                          )}
                        </div>
                        {ticket.zohoTicketId && (
                          <a
                            href={ticket.zohoWebUrl || `https://desk.zoho.com/support/parletech/ShowHomePage.do#Cases/dv/${ticket.zohoTicketId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-mono text-slate-400 hover:text-blue-600 flex items-center gap-0.5 mt-0.5"
                            title="Open in Zoho Desk"
                          >
                            <span>#{ticket.zohoTicketId}</span>
                            <span className="text-[9px]">↗</span>
                          </a>
                        )}
                      </td>

                      {/* Subject & Channel */}
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          prefetch={true}
                          className="font-semibold text-slate-800 hover:text-blue-600 line-clamp-1 block leading-snug"
                          title={ticket.subject}
                        >
                          {ticket.subject}
                        </Link>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{ticket.channel || 'Email'}</span>
                          <span>•</span>
                          <span>{ticket._count?.comments || 0} message{ticket._count?.comments === 1 ? '' : 's'}</span>
                          {ticket.deviceHostname && ticket.zohoTicketId && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-mono font-medium flex items-center gap-1">
                                🖥️ {ticket.deviceHostname}
                              </span>
                            </>
                          )}
                          {ticket.reportedSymptoms && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[150px] text-slate-400">{ticket.reportedSymptoms}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Requester with initial avatar */}
                      <td className="px-4 py-3 align-top hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {reqInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate max-w-[140px] leading-tight">
                              {reqName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[140px] leading-tight">
                              {ticket.requester?.email || ticket.customer?.email || ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Engineer */}
                      <td className="px-4 py-3 align-top hidden lg:table-cell">
                        {!isUnassigned ? (
                          <div>
                            <p className="font-semibold text-slate-800 flex items-center gap-1.5 leading-tight">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span className="truncate max-w-[140px]">{ticket.assignedEngineerName}</span>
                            </p>
                            {ticket.assignedEngineerEmail && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[140px] pl-3 leading-tight mt-0.5">
                                {ticket.assignedEngineerEmail}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            ⚠️ Unassigned
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3 align-top hidden md:table-cell whitespace-nowrap">
                        <span className="text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          {ticket.department?.name || ticket.company || 'Parle Technologies'}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3 align-top text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${priorityColor(ticket.priority)}`}>
                          {priorityLabel(ticket.priority)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 align-top text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor(ticket.status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                          {statusLabel(ticket.status)}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-3 align-top hidden sm:table-cell text-right whitespace-nowrap">
                        <p className="text-slate-700 font-medium">{formatDate(ticket.createdAt)}</p>
                        <p className="text-[10px] text-slate-400">{formatRelativeTime(ticket.createdAt)}</p>
                      </td>
                    </tr>
                  )
                })}

                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <div className="max-w-sm mx-auto space-y-2">
                        <p className="font-semibold text-slate-800 text-sm">No tickets found</p>
                        <p className="text-slate-400 text-xs">No tickets match the current filter selection or search query.</p>
                        <Button asChild size="sm" className="mt-2 bg-blue-600 text-white">
                          <Link href="/tickets">Clear All Filters</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Zoho Desk Clean Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60 text-xs">
              <p className="text-slate-500 text-xs">
                Showing <span className="font-semibold text-slate-800">{skip + 1}</span> -{' '}
                <span className="font-semibold text-slate-800">{Math.min(skip + limit, total)}</span> of{' '}
                <span className="font-semibold text-slate-800">{total}</span> tickets
              </p>
              <div className="flex items-center gap-1.5">
                {page > 1 ? (
                  <Button variant="outline" size="sm" asChild className="h-7.5 px-2.5 text-xs bg-white border-slate-200">
                    <Link href={`/tickets?page=${page - 1}&status=${params.status || ''}&search=${params.search || ''}&vip=${params.vip || ''}&company=${params.company || ''}&agent=${params.agent || ''}`}>
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="h-7.5 px-2.5 text-xs opacity-50 bg-white">
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                  </Button>
                )}

                <span className="text-xs px-2 text-slate-600 font-medium">
                  {page} / {totalPages}
                </span>

                {page < totalPages ? (
                  <Button variant="outline" size="sm" asChild className="h-7.5 px-2.5 text-xs bg-white border-slate-200">
                    <Link href={`/tickets?page=${page + 1}&status=${params.status || ''}&search=${params.search || ''}&vip=${params.vip || ''}&company=${params.company || ''}&agent=${params.agent || ''}`}>
                      Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="h-7.5 px-2.5 text-xs opacity-50 bg-white">
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
