import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const direction = searchParams.get('direction') // 'INBOUND' | 'OUTBOUND' | null
  const ticketId = searchParams.get('ticketId')
  const ticketNumber = searchParams.get('ticketNumber')
  const search = searchParams.get('search')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  const where: any = {}

  if (direction === 'INBOUND' || direction === 'OUTBOUND') {
    where.direction = direction
  }

  if (ticketId) {
    where.ticketId = ticketId
  }

  if (ticketNumber) {
    where.ticketNumber = ticketNumber
  }

  if (search) {
    where.OR = [
      { from: { contains: search, mode: 'insensitive' } },
      { to: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
      { body: { contains: search, mode: 'insensitive' } },
      { agentName: { contains: search, mode: 'insensitive' } },
      { ticketNumber: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
          },
        },
      },
    })

    const totalCount = await prisma.emailLog.count({ where })
    const inboundCount = await prisma.emailLog.count({ where: { direction: 'INBOUND' } })
    const outboundCount = await prisma.emailLog.count({ where: { direction: 'OUTBOUND' } })

    return NextResponse.json({
      logs,
      totalCount,
      inboundCount,
      outboundCount,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch email logs' }, { status: 500 })
  }
}
