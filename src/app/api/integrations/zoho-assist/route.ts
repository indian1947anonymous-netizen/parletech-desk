import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { zohoAssistService } from '@/lib/integrations/zoho-assist'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, customerEmail, customerName, ticketNumber, ticketId, notes } = body

    if (action === 'test') {
      const result = await zohoAssistService.testConnection()
      return NextResponse.json(result)
    }

    if (action === 'createSession') {
      const result = await zohoAssistService.createSession({
        customerEmail,
        customerName,
        ticketNumber,
        ticketId,
        userId: session.user.id,
        notes
      })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
