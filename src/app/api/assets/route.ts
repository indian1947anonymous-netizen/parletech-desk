import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  assetTag: z.string().min(1),
  name: z.string().min(1),
  type: z.enum([
    'LAPTOP',
    'DESKTOP',
    'PHONE',
    'MONITOR',
    'TABLET',
    'PRINTER',
    'SERVER',
    'NETWORK',
    'PERIPHERAL',
    'OTHER',
  ]),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.enum(['ACTIVE', 'IN_REPAIR', 'RETIRED', 'LOST', 'SPARE']).default('ACTIVE'),
  location: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  warrantyUntil: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  assignedUserId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search')
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 25
  const skip = (page - 1) * limit

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { assetTag: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (type && type !== 'all') where.type = type
  if (status && status !== 'all') where.status = status

  try {
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignments: {
            where: { returnedAt: null },
            include: { user: { select: { id: true, name: true, email: true, department: true } } },
            take: 1,
          },
        },
      }),
      prisma.asset.count({ where }),
    ])

    return NextResponse.json({ assets, total, page, totalPages: Math.ceil(total / limit) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const asset = await prisma.asset.create({
      data: {
        assetTag: data.assetTag,
        name: data.name,
        type: data.type,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        status: data.status,
        location: data.location,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        purchasePrice: data.purchasePrice,
        warrantyUntil: data.warrantyUntil ? new Date(data.warrantyUntil) : undefined,
        vendor: data.vendor,
        notes: data.notes,
      },
    })

    if (data.assignedUserId) {
      await prisma.assetAssignment.create({
        data: {
          assetId: asset.id,
          userId: data.assignedUserId,
        },
      })
    }

    return NextResponse.json({ asset }, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Asset tag already registered' }, { status: 409 })
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
