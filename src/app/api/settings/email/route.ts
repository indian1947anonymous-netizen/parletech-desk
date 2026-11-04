import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { pollGmailInbox } from '@/lib/imap'
import { z } from 'zod'

const schema = z.object({
  gmail_email: z.string().email(),
  gmail_app_password: z.string().min(8),
  imap_host: z.string().default('imap.gmail.com'),
  imap_port: z.string().default('993'),
  auto_poll: z.boolean().default(true),
})

export async function GET() {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [emailSetting, hostSetting, portSetting, pollSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: 'gmail_email' } }),
    prisma.systemSetting.findUnique({ where: { key: 'imap_host' } }),
    prisma.systemSetting.findUnique({ where: { key: 'imap_port' } }),
    prisma.systemSetting.findUnique({ where: { key: 'email_auto_poll' } }),
  ])

  return NextResponse.json({
    gmail_email: emailSetting?.value || '',
    imap_host: hostSetting?.value || 'imap.gmail.com',
    imap_port: portSetting?.value || '993',
    auto_poll: pollSetting?.value === 'true',
    hasPasswordConfigured: Boolean(await prisma.systemSetting.findUnique({ where: { key: 'gmail_app_password' } })),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Upsert system settings
    await Promise.all([
      prisma.systemSetting.upsert({
        where: { key: 'gmail_email' },
        create: { key: 'gmail_email', value: data.gmail_email, group: 'email' },
        update: { value: data.gmail_email },
      }),
      prisma.systemSetting.upsert({
        where: { key: 'gmail_app_password' },
        create: { key: 'gmail_app_password', value: data.gmail_app_password, group: 'email' },
        update: { value: data.gmail_app_password },
      }),
      prisma.systemSetting.upsert({
        where: { key: 'imap_host' },
        create: { key: 'imap_host', value: data.imap_host, group: 'email' },
        update: { value: data.imap_host },
      }),
      prisma.systemSetting.upsert({
        where: { key: 'imap_port' },
        create: { key: 'imap_port', value: data.imap_port, group: 'email' },
        update: { value: data.imap_port },
      }),
      prisma.systemSetting.upsert({
        where: { key: 'email_auto_poll' },
        create: { key: 'email_auto_poll', value: String(data.auto_poll), group: 'email' },
        update: { value: String(data.auto_poll) },
      }),
    ])

    // Test connection
    const testResult = await pollGmailInbox()

    return NextResponse.json({
      success: true,
      message: 'Gmail configuration saved successfully!',
      testResult,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', issues: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
