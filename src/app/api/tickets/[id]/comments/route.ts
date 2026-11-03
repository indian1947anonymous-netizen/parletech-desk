import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { sendEmail, newReplyEmail } from '@/lib/email'

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
        requester: { select: { name: true, email: true } },
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

    // Email notification if public reply
    if (data.type === 'PUBLIC_REPLY' && ticket.requester?.email && session.user.id !== ticket.requesterId) {
      const email = newReplyEmail({
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        agentName: session.user.name || 'Support Team',
        replyPreview: data.content.slice(0, 200),
        requesterName: ticket.requester.name || 'User',
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      })
      sendEmail({ to: ticket.requester.email, ...email }).catch(console.error)
    }

    // App notification for user
    if (ticket.requesterId && ticket.requesterId !== session.user.id && data.type === 'PUBLIC_REPLY') {
      await prisma.notification.create({
        data: {
          userId: ticket.requesterId,
          title: `Reply on ${ticket.ticketNumber}`,
          message: `${session.user.name || 'Agent'} replied to "${ticket.subject}"`,
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
