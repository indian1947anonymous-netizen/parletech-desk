import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2),
  departmentId: z.string().optional(),
  protocol: z.enum(['FORWARDING', 'IMAP']).default('FORWARDING'),
  imapHost: z.string().optional(),
  imapPort: z.coerce.number().optional(),
  imapUsername: z.string().optional(),
  imapPassword: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supportEmails = await prisma.supportEmail.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ supportEmails })
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

    // Generate unique system forwarding address (Zoho Desk format)
    const cleanPrefix = data.email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const randomSuffix = Math.random().toString(36).substring(2, 6)
    const forwardingAddress = `desk-${cleanPrefix}-${randomSuffix}@parletech.desk-mail.com`

    const supportEmail = await prisma.supportEmail.create({
      data: {
        email: data.email.toLowerCase(),
        displayName: data.displayName,
        departmentId: data.departmentId || null,
        forwardingAddress,
        protocol: data.protocol,
        imapHost: data.imapHost,
        imapPort: data.imapPort,
        imapUsername: data.imapUsername,
        imapPassword: data.imapPassword,
        isVerified: data.protocol === 'IMAP' ? true : false,
      },
      include: { department: true },
    })

    return NextResponse.json({ supportEmail }, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'This support email address is already added.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

  await prisma.supportEmail.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
