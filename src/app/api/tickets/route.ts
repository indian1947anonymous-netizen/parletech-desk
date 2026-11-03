import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { sendEmail, ticketCreatedEmail } from '@/lib/email'

const createSchema = z.object({
  subject: z.string().min(5).max(255),
  description: z.string().min(10),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  departmentId: z.string().optional(),
  agentId: z.string().optional(),
  customerId: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  const skip = (page - 1) * limit

  const where: any = {}

  if (session.user.role === 'END_USER') {
    where.requesterId = session.user.id
  }

  const search = searchParams.get('search')
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { ticketNumber: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const status = searchParams.get('status')
  if (status && status !== 'all') where.status = status

  const priority = searchParams.get('priority')
  if (priority && priority !== 'all') where.priority = priority

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { name: true, email: true } },
        agent: { select: { name: true } },
        department: { select: { name: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ])

  return NextResponse.json({ tickets, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    // Generate ticket number
    const count = await prisma.ticket.count()
    const ticketNumber = `TKT-${String(count + 1).padStart(4, '0')}`

    // Calculate SLA dates based on policy
    let slaResponseDue: Date | undefined
    let slaResolutionDue: Date | undefined
    let slaPolicyId: string | undefined

    const slaPolicy = await prisma.slaPolicy.findFirst({
      where: {
        OR: [
          { priority: data.priority },
          { isDefault: true }
        ],
        isActive: true,
      },
      orderBy: { priority: 'desc' }
    })

    const now = new Date()
    if (slaPolicy) {
      slaPolicyId = slaPolicy.id
      slaResponseDue = new Date(now.getTime() + slaPolicy.responseTimeHours * 3600 * 1000)
      slaResolutionDue = new Date(now.getTime() + slaPolicy.resolutionTimeHours * 3600 * 1000)
    } else {
      // Default fallback
      slaResponseDue = new Date(now.getTime() + 4 * 3600 * 1000)
      slaResolutionDue = new Date(now.getTime() + 24 * 3600 * 1000)
    }

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        category: data.category,
        subcategory: data.subcategory,
        departmentId: data.departmentId || undefined,
        agentId: data.agentId || undefined,
        customerId: data.customerId || undefined,
        tags: data.tags || [],
        requesterId: session.user.id!,
        slaPolicyId,
        slaResponseDue,
        slaResolutionDue,
      },
    })

    // Log initial activity
    await prisma.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        userId: session.user.id!,
        action: 'CREATED',
        description: `Ticket created by ${session.user.name || session.user.email}`,
      },
    })

    // Send confirmation email asynchronously
    const requester = await prisma.user.findUnique({ where: { id: session.user.id! } })
    if (requester?.email) {
      const email = ticketCreatedEmail({
        ticketNumber,
        subject: data.subject,
        requesterName: requester.name || 'User',
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      })
      sendEmail({ to: requester.email, ...email }).catch(console.error)
    }

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', issues: error.issues }, { status: 400 })
    }
    console.error('Create ticket error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create ticket' }, { status: 500 })
  }
}
