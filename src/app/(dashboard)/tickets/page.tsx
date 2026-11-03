import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatRelativeTime, statusColor, statusLabel, priorityColor, priorityLabel, isOverdue } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TicketFilters } from '@/components/tickets/ticket-filters'
import { Plus, AlertTriangle, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tickets' }

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    priority?: string
    department?: string
    agent?: string
    page?: string
    sort?: string
  }>
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const limit = 20
  const skip = (page - 1) * limit

  const where: any = {}

  // Role-based restrictions
  if (session.user.role === 'END_USER') {
    where.requesterId = session.user.id
  }

  if (params.search) {
    where.OR = [
      { subject: { contains: params.search, mode: 'insensitive' } },
      { ticketNumber: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
    ]
  }
  if (params.status && params.status !== 'all') where.status = params.status
  if (params.priority && params.priority !== 'all') where.priority = params.priority
  if (params.department && params.department !== 'all') where.departmentId = params.department
  if (params.agent && params.agent !== 'all') where.agentId = params.agent

  const orderBy: any = {}
  switch (params.sort) {
    case 'priority': orderBy.priority = 'desc'; break
    case 'updated': orderBy.updatedAt = 'desc'; break
    case 'oldest': orderBy.createdAt = 'asc'; break
    default: orderBy.createdAt = 'desc'
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
          requester: { select: { name: true, email: true } },
          customer: { select: { name: true, email: true } },
          agent: { select: { name: true } },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} total {total === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/tickets/new">
            <Plus className="h-4 w-4 mr-1.5" /> New Ticket
          </Link>
        </Button>
      </div>

      <TicketFilters departments={departments} agents={agents} />

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Requester</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Assigned Agent</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Department</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => {
                  const overdue = isOverdue(ticket.slaResolutionDue) && !['RESOLVED', 'CLOSED'].includes(ticket.status)
                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/tickets/${ticket.id}`} className="group block">
                          <div className="flex items-center gap-2">
                            {overdue && (
                              <span title="Resolution SLA Overdue">
                                <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 animate-pulse" />
                              </span>
                            )}
                            <span className="font-semibold text-sm text-blue-600 group-hover:underline">
                              {ticket.ticketNumber}
                            </span>
                            {ticket._count?.comments > 0 && (
                              <span className="inline-flex items-center text-xs text-slate-400 gap-0.5">
                                <MessageSquare className="h-3 w-3" />
                                {ticket._count.comments}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 font-medium truncate max-w-[240px] sm:max-w-[320px] mt-0.5">
                            {ticket.subject}
                          </p>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className="text-sm font-medium text-slate-800">
                          {ticket.requester?.name || ticket.customer?.name || '—'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {ticket.requester?.email || ticket.customer?.email || ''}
                        </p>
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
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <p className="text-sm text-slate-700">
                          {ticket.agent?.name || <span className="text-slate-400 italic">Unassigned</span>}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <p className="text-xs text-slate-600 font-medium">{ticket.department?.name || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <p className="text-xs text-slate-500">{formatRelativeTime(ticket.createdAt)}</p>
                      </td>
                    </tr>
                  )
                })}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <p className="text-slate-500 text-sm">No tickets matched the filter criteria.</p>
                      <Button asChild className="mt-4" size="sm">
                        <Link href="/tickets/new">Create a Ticket</Link>
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold">{skip + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(skip + limit, total)}</span> of{' '}
                <span className="font-semibold">{total}</span>
              </p>
              <div className="flex items-center gap-1.5">
                {page > 1 ? (
                  <Button variant="outline" size="sm" asChild className="h-8 px-2 text-xs">
                    <Link href={`/tickets?page=${page - 1}&status=${params.status || ''}&search=${params.search || ''}`}>
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="h-8 px-2 text-xs opacity-50">
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                  </Button>
                )}

                <span className="text-xs px-2 text-slate-600 font-medium">
                  Page {page} of {totalPages}
                </span>

                {page < totalPages ? (
                  <Button variant="outline" size="sm" asChild className="h-8 px-2 text-xs">
                    <Link href={`/tickets?page=${page + 1}&status=${params.status || ''}&search=${params.search || ''}`}>
                      Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="h-8 px-2 text-xs opacity-50">
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
