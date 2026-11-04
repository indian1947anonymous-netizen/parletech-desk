import { NextRequest, NextResponse } from 'next/server'
import { processIncomingEmail } from '@/lib/email-to-ticket'

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let payload: any = {}

    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      payload = {
        from: formData.get('from') || formData.get('sender') || formData.get('envelope[from]') || '',
        to: formData.get('to') || formData.get('recipient') || '',
        subject: formData.get('subject') || '',
        text: formData.get('text') || formData.get('plain') || formData.get('body-plain') || '',
        html: formData.get('html') || formData.get('body-html') || '',
        messageId: formData.get('Message-Id') || formData.get('message-id') || '',
      }
    } else {
      payload = await req.json()
    }

    if (!payload.from) {
      return NextResponse.json({ error: 'Missing "from" address in email payload' }, { status: 400 })
    }

    const result = await processIncomingEmail({
      from: String(payload.from),
      to: payload.to ? String(payload.to) : undefined,
      subject: payload.subject ? String(payload.subject) : '(No Subject)',
      text: payload.text ? String(payload.text) : undefined,
      html: payload.html ? String(payload.html) : undefined,
      messageId: payload.messageId ? String(payload.messageId) : undefined,
      inReplyTo: payload.inReplyTo ? String(payload.inReplyTo) : undefined,
      references: payload.references ? String(payload.references) : undefined,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || result.reason }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action: result.action,
      ticketNumber: result.ticketNumber,
      ticketId: result.ticketId,
    })
  } catch (error: any) {
    console.error('Inbound email webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
