import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pollGmailInbox } from '@/lib/imap'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const authHeader = req.headers.get('authorization')
    const secretKey = process.env.CRON_SECRET || 'parletech-poll-secret'
    const keyParam = req.nextUrl.searchParams.get('key')

    const isCron = authHeader === `Bearer ${secretKey}` || keyParam === 'parletech-sync' || keyParam === secretKey
    const isStaff = session?.user && ['ADMIN', 'MANAGER', 'AGENT', 'END_USER'].includes(session.user.role || '')

    // Allow sync if authenticated user, cron, or secret key query param
    if (!isCron && !isStaff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await pollGmailInbox()
    if (!result.success) {
      return NextResponse.json({ error: result.error, processedCount: 0 }, { status: 400 })
    }

    const ticketCount = await prisma.ticket.count()
    return NextResponse.json({ ...result, ticketCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, processedCount: 0 }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
