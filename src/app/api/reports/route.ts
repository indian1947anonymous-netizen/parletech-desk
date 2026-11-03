import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const format = searchParams.get('format') // json or csv

  try {
    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      statusCounts,
      priorityCounts,
      departmentCounts,
      agentPerformance,
      allTicketsList,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.ticket.groupBy({ by: ['priority'], _count: { priority: true } }),
      prisma.department.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { tickets: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MANAGER', 'AGENT'] } },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              assignedTickets: true,
            },
          },
        },
      }),
      prisma.ticket.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { name: true, email: true } },
          agent: { select: { name: true } },
          department: { select: { name: true } },
        },
      }),
    ])

    if (format === 'csv') {
      const headers = ['Ticket Number', 'Subject', 'Status', 'Priority', 'Requester', 'Agent', 'Department', 'Created At']
      const rows = allTicketsList.map(t => [
        t.ticketNumber,
        `"${t.subject.replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        `"${t.requester?.name || 'External'}"`,
        `"${t.agent?.name || 'Unassigned'}"`,
        `"${t.department?.name || 'None'}"`,
        t.createdAt.toISOString(),
      ])

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="parletech-tickets-report.csv"',
        },
      })
    }

    return NextResponse.json({
      summary: {
        totalTickets,
        openTickets,
        resolvedTickets,
      },
      statusCounts,
      priorityCounts,
      departmentCounts,
      agentPerformance,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
