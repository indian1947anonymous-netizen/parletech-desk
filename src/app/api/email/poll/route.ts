import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pollGmailInbox } from '@/lib/imap'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  // Can be called by authenticated agent/admin or with a secret token for cron
  const authHeader = req.headers.get('authorization')
  const secretKey = process.env.CRON_SECRET || 'parletech-poll-secret'

  const isCron = authHeader === `Bearer ${secretKey}`
  const isStaff = session?.user && ['ADMIN', 'MANAGER', 'AGENT'].includes(session.user.role || '')

  if (!isCron && !isStaff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await pollGmailInbox()
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const ticketCount = await prisma.ticket.count()
  return NextResponse.json({ ...result, ticketCount })
}

export async function GET(req: NextRequest) {
  // Allow manual GET trigger from dashboard or cron
  return POST(req)
}
