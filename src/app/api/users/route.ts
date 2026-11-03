import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'END_USER']).default('END_USER'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const role = searchParams.get('role')
  const search = searchParams.get('search')

  const where: any = {}
  if (role && role !== 'all') where.role = role
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        jobTitle: true,
        department: true,
        createdAt: true,
        image: true,
        _count: {
          select: {
            assignedTickets: { where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } },
            assetAssignments: { where: { returnedAt: null } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ users })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    const hashed = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashed,
        role: data.role,
        jobTitle: data.jobTitle,
        department: data.department,
        phone: data.phone,
      },
      select: { id: true, name: true, email: true, role: true },
    })

    if (data.role === 'AGENT' || data.role === 'MANAGER' || data.role === 'ADMIN') {
      let deptId: string | undefined
      if (data.department) {
        const d = await prisma.department.findFirst({ where: { name: data.department } })
        if (d) deptId = d.id
      }
      await prisma.agent.create({
        data: {
          userId: user.id,
          departmentId: deptId,
        },
      })
    }

    return NextResponse.json({ user }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
