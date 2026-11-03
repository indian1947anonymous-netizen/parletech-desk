import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  subject: z.string().min(5).optional(),
  description: z.string().optional(),
  status: z.enum([
    'OPEN',
    'IN_PROGRESS',
    'WAITING_FOR_CUSTOMER',
    'WAITING_FOR_THIRD_PARTY',
    'ON_HOLD',
    'RESOLVED',
    'CLOSED',
  ]).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  agentId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, email: true, jobTitle: true, department: true } },
      customer: true,
      agent: { select: { id: true, name: true, email: true } },
      department: true,
      slaPolicy: true,
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true, role: true, image: true } },
          attachments: true,
        },
      },
      attachments: true,
      activities: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  })

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  if (session.user.role === 'END_USER' && ticket.requesterId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ ticket })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    const existing = await prisma.ticket.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const updateData: any = { ...data }

    if (data.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date()
    }
    if (data.status === 'CLOSED' && existing.status !== 'CLOSED') {
      updateData.closedAt = new Date()
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
    })

    // Log activity
    const changes: string[] = []
    if (data.status && data.status !== existing.status) changes.push(`Status changed to ${data.status}`)
    if (data.priority && data.priority !== existing.priority) changes.push(`Priority changed to ${data.priority}`)
    if (data.agentId !== undefined) {
      if (data.agentId) {
        const agent = await prisma.user.findUnique({ where: { id: data.agentId }, select: { name: true } })
        changes.push(`Assigned to ${agent?.name || 'Agent'}`)
      } else {
        changes.push('Unassigned agent')
      }
    }
    if (data.departmentId !== undefined) {
      if (data.departmentId) {
        const dept = await prisma.department.findUnique({ where: { id: data.departmentId }, select: { name: true } })
        changes.push(`Department set to ${dept?.name || 'Department'}`)
      } else {
        changes.push('Removed department')
      }
    }

    if (changes.length > 0) {
      await prisma.ticketActivity.create({
        data: {
          ticketId: id,
          userId: session.user.id!,
          action: 'UPDATED',
          description: changes.join(' • '),
          metadata: data,
        },
      })
    }

    return NextResponse.json({ ticket })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', issues: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Failed to update ticket' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || !['ADMIN'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  await prisma.ticket.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
