import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rules = await prisma.vipRule.findMany({
      orderBy: { priority: 'asc' }
    })

    return NextResponse.json({ rules })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.role || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, matchType, pattern, priority, isActive, description } = body

    if (!name || !matchType || !pattern) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const rule = await prisma.vipRule.create({
      data: {
        name,
        matchType,
        pattern,
        priority: priority || 1,
        isActive: isActive !== false,
        description
      }
    })

    return NextResponse.json({ rule })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.role || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { id, isActive, priority, pattern } = body

    if (!id) return NextResponse.json({ error: 'Rule ID required' }, { status: 400 })

    const updated = await prisma.vipRule.update({
      where: { id },
      data: {
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(typeof priority === 'number' && { priority }),
        ...(pattern && { pattern })
      }
    })

    return NextResponse.json({ rule: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.role || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Rule ID required' }, { status: 400 })

    await prisma.vipRule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
