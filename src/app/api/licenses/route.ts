import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  productName: z.string().min(1),
  vendor: z.string().optional(),
  licenseType: z.string().min(1),
  totalSeats: z.number().int().positive(),
  purchaseDate: z.string().optional(),
  expirationDate: z.string().optional(),
  licenseKey: z.string().optional(),
  cost: z.number().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const licenses = await prisma.softwareLicense.findMany({
      where: { isActive: true },
      orderBy: { productName: 'asc' },
      include: {
        assignments: {
          where: { revokedAt: null },
          include: {
            user: { select: { id: true, name: true, email: true, department: true } },
          },
        },
        _count: {
          select: {
            assignments: { where: { revokedAt: null } },
          },
        },
      },
    })

    return NextResponse.json({ licenses })
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
    const license = await prisma.softwareLicense.create({
      data: {
        productName: data.productName,
        vendor: data.vendor,
        licenseType: data.licenseType,
        totalSeats: data.totalSeats,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
        licenseKey: data.licenseKey,
        cost: data.cost,
        notes: data.notes,
      },
    })

    return NextResponse.json({ license }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
