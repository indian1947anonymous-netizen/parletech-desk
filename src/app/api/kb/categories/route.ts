import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  icon: z.string().optional(),
})

export async function GET() {
  try {
    const categories = await prisma.kbCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { articles: true } },
      },
    })
    return NextResponse.json({ categories })
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
    const category = await prisma.kbCategory.create({ data })
    return NextResponse.json({ category }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
