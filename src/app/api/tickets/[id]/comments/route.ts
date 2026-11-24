import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { sendEmail, newReplyEmail } from '@/lib/email'
import { zohoDeskService } from '@/lib/integrations/zoho'

const schema = z.object({
  content: z.string().min(1),
  type: z.enum(['PUBLIC_REPLY', 'INTERNAL_NOTE']).default('PUBLIC_REPLY'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const data = schema.parse(body)

    if (data.type === 'INTERNAL_NOTE' && !['ADMIN', 'MANAGER', 'AGENT'].includes(session.user.role!)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, email: true } },
      },
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: id,
        authorId: session.user.id!,
        content: data.content,
        type: data.type,
      },
      include: {
        author: { select: { id: true, name: true, role: true, image: true } },
      },
    })

    // Update ticket updatedAt and firstResponseAt if applicable
    const updateTicketData: any = { updatedAt: new Date() }
    if (data.type === 'PUBLIC_REPLY' && !ticket.firstResponseAt && ['ADMIN', 'MANAGER', 'AGENT'].includes(session.user.role!)) {
      updateTicketData.firstResponseAt = new Date()
    }
    await prisma.ticket.update({
      where: { id },
      data: updateTicketData,
    })

    // Log activity
    await prisma.ticketActivity.create({
      data: {
        ticketId: id,
        userId: session.user.id!,
        action: data.type === 'INTERNAL_NOTE' ? 'INTERNAL_NOTE' : 'REPLIED',
        description: data.type === 'INTERNAL_NOTE' ? 'Added internal note' : 'Sent public reply',
      },
    })

    // Email notification if public reply (Sent directly from the user's Gmail account)
    const recipientEmail = ticket.customer?.email || ticket.requester?.email
    const recipientName = ticket.customer?.name || ticket.requester?.name || 'Customer'
    const agentName = session.user.name || 'Support Agent'
    const gmailAccount = process.env.GMAIL_EMAIL || process.env.SMTP_USER || 'Indian1947anonymous@gmail.com'

    if (data.type === 'PUBLIC_REPLY' && recipientEmail) {
      // ONLY Zoho Desk tickets have Kaseya device and Zoho Assist
      const isZohoTicket = !!ticket.zohoTicketId
      let zohoAssistUrl: string | undefined = undefined
      let deviceHostname: string | undefined = undefined

      if (isZohoTicket) {
        const kaseyaDev = await prisma.kaseyaDevice.findFirst({
          where: {
            OR: [
              ...(recipientEmail ? [{ assignedUserEmail: { equals: recipientEmail, mode: 'insensitive' as const } }] : []),
              ...(ticket.deviceHostname ? [{ hostname: ticket.deviceHostname }] : []),
              { assignedUserName: { contains: recipientName, mode: 'insensitive' as const } }
            ]
          }
        })
        zohoAssistUrl = (ticket.kaseyaData as any)?.zohoAssistUrl || (kaseyaDev ? `https://assist.zoho.com/app/agent?email=${encodeURIComponent(recipientEmail)}` : undefined)
        deviceHostname = ticket.deviceHostname || kaseyaDev?.hostname || undefined
      }

      const email = newReplyEmail({
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        agentName,
        replyPreview: data.content,
        requesterName: recipientName,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://parletech-desk.vercel.app',
        zohoAssistUrl,
        deviceHostname,
      })

      sendEmail({
        to: recipientEmail,
        from: `"${agentName} (ParleTech Desk)" <${gmailAccount}>`,
        replyTo: gmailAccount,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        agentName,
        agentEmail: gmailAccount,
        direction: 'OUTBOUND',
      }).catch(err => {
        console.error('[Email Send Failure]:', err)
      })
    }

    // Sync updates directly with Zoho Desk if this ticket originated from Zoho Desk
    if (ticket.zohoTicketId) {
      if (data.type === 'INTERNAL_NOTE') {
        zohoDeskService.addComment(ticket.zohoTicketId, data.content, false).catch((err) => {
          console.warn('[Zoho Desk API] Internal note sync skipped or failed:', err.message)
        })
      } else if (data.type === 'PUBLIC_REPLY') {
        zohoDeskService.sendReply(ticket.zohoTicketId, data.content, recipientEmail).catch((err) => {
          console.warn('[Zoho Desk API] Public reply sync skipped or failed:', err.message)
        })
      }
    }

    // App notification for user
    if (ticket.requesterId && ticket.requesterId !== session.user.id && data.type === 'PUBLIC_REPLY') {
      await prisma.notification.create({
        data: {
          userId: ticket.requesterId,
          title: `Reply on ${ticket.ticketNumber}`,
          message: `${agentName} replied to "${ticket.subject}"`,
          type: 'ticket',
          link: `/tickets/${id}`,
        },
      }).catch(console.error)
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', issues: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Failed to add comment' }, { status: 500 })
  }
}
