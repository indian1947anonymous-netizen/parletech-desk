import { prisma } from '@/lib/db'
import { sendEmail, ticketCreatedEmail } from '@/lib/email'

interface IncomingEmailPayload {
  from: string
  to?: string
  subject: string
  text?: string
  html?: string
  messageId?: string
  inReplyTo?: string
  references?: string | string[]
}

export async function processIncomingEmail(email: IncomingEmailPayload) {
  try {
    const rawFrom = email.from || ''
    // Extract name and email address from "John Doe <john@example.com>" or "john@example.com"
    const match = rawFrom.match(/(?:(.+?)\s*<)?([^>]+@[^>]+)>?/)
    const senderName = match ? (match[1]?.trim() || match[2].split('@')[0]) : 'Email Requester'
    const senderEmail = (match ? match[2] : rawFrom).trim().toLowerCase()

    if (!senderEmail || !senderEmail.includes('@')) {
      console.warn('Invalid sender email format in incoming email:', rawFrom)
      return { success: false, reason: 'Invalid sender email' }
    }

    const subject = email.subject?.trim() || '(No Subject)'
    const bodyContent = email.text?.trim() || email.html?.trim() || '(No email content provided)'
    const recipientTo = (email.to || '').toLowerCase()

    // 1. Check if this is a Gmail Forwarding Confirmation email (Zoho Desk helper)
    if (subject.toLowerCase().includes('gmail forwarding confirmation') || bodyContent.includes('confirmation code:')) {
      const codeMatch = bodyContent.match(/(?:confirmation code:\s*|code is\s*)([0-9]{6,12})/i)
      if (codeMatch) {
        const verificationCode = codeMatch[1]
        // Find matching support email channel
        const matchedChannel = await prisma.supportEmail.findFirst({
          where: {
            OR: [
              { email: { in: [recipientTo, senderEmail] } },
              { forwardingAddress: { contains: recipientTo } },
            ],
          },
        })
        if (matchedChannel) {
          await prisma.supportEmail.update({
            where: { id: matchedChannel.id },
            data: {
              verificationCode,
              isVerified: true,
            },
          })
          console.log(`Captured Gmail forwarding verification code: ${verificationCode}`)
        }
      }
    }

    // 2. Check for ticket thread ID in subject: e.g. [TKT-0001], TKT-0558 or inReplyTo
    let existingTicket: any = null
    const ticketNumberMatch = subject.match(/TKT-\d+/i)

    if (ticketNumberMatch) {
      const ticketNumber = ticketNumberMatch[0].toUpperCase()
      existingTicket = await prisma.ticket.findUnique({
        where: { ticketNumber },
        include: { requester: true, customer: true },
      })
    }

    if (!existingTicket && email.inReplyTo) {
      const matchingLog = await prisma.emailLog.findFirst({
        where: { messageId: email.inReplyTo, ticketId: { not: null } },
        include: { ticket: { include: { requester: true, customer: true } } }
      })
      if (matchingLog?.ticket) {
        existingTicket = matchingLog.ticket
      }
    }

    if (existingTicket) {
      // Strip quoted email thread to keep customer reply clean
      const cleanReply = bodyContent.split(/\r?\nOn .* wrote:|\r?\n---* Original Message ---*|\r?\nFrom:.*Sent:|\r?\n_{5,}/i)[0].trim() || bodyContent

      // Find author user
      const authorUser = await prisma.user.findUnique({ where: { email: senderEmail } })
      const fallbackAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
      const authorId = authorUser?.id || existingTicket.requesterId || fallbackAdmin?.id || ''

      // Add reply to ticket
      await prisma.ticketComment.create({
        data: {
          ticketId: existingTicket.id,
          authorId,
          content: `[Received via Email from ${senderName} <${senderEmail}>]\n\n${cleanReply}`,
          type: 'PUBLIC_REPLY',
        },
      })

      // Reopen ticket if it was resolved or waiting
      const newStatus = existingTicket.status === 'RESOLVED' || existingTicket.status === 'CLOSED'
        ? 'OPEN'
        : existingTicket.status === 'WAITING_FOR_CUSTOMER'
        ? 'IN_PROGRESS'
        : existingTicket.status

      await prisma.ticket.update({
        where: { id: existingTicket.id },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      })

      await prisma.ticketActivity.create({
        data: {
          ticketId: existingTicket.id,
          userId: authorId,
          action: 'REPLIED',
          description: `New email reply received from ${senderEmail}`,
        },
      })

      // Log inbound email into EmailLog
      await prisma.emailLog.create({
        data: {
          direction: 'INBOUND',
          from: rawFrom,
          to: recipientTo || 'support@parletech.com',
          subject,
          body: cleanReply,
          htmlBody: email.html,
          ticketId: existingTicket.id,
          ticketNumber: existingTicket.ticketNumber,
          messageId: email.messageId,
          inReplyTo: email.inReplyTo,
          status: 'DELIVERED',
        },
      }).catch(console.error)

      return {
        success: true,
        action: 'REPLY_ADDED',
        ticketId: existingTicket.id,
        ticketNumber: existingTicket.ticketNumber,
      }
    }

    // 3. New Ticket Creation from Email
    // Check if recipient matches a configured Support Email channel (Zoho Desk routing)
    let assignedDepartmentId: string | undefined
    if (recipientTo) {
      const supportEmailChannel = await prisma.supportEmail.findFirst({
        where: {
          OR: [
            { email: recipientTo },
            { forwardingAddress: { contains: recipientTo } },
          ],
        },
      })
      if (supportEmailChannel?.departmentId) {
        assignedDepartmentId = supportEmailChannel.departmentId
      }
    }

    // Find or create User / Customer
    let user = await prisma.user.findUnique({ where: { email: senderEmail } })
    let customer = await prisma.customer.findUnique({ where: { email: senderEmail } })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: senderName,
          email: senderEmail,
          notes: 'Auto-created from incoming email',
        },
      }).catch(() => null)
    }

    // Create an END_USER record for this requester if they don't have a user account
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: senderName,
          email: senderEmail,
          role: 'END_USER',
          department: 'Customer',
        },
      }).catch(async () => {
        return await prisma.user.findUnique({ where: { email: senderEmail } })
      })
    }

    // Default admin user fallback only if user creation completely fails
    if (!user) {
      user = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    }

    // Correlate with Kaseya endpoint device using email or name (e.g. Adam)
    // Generate ticket number
    const count = await prisma.ticket.count()
    const ticketNumber = `TKT-${String(count + 1).padStart(4, '0')}`

    // Calculate SLA
    const defaultSla = await prisma.slaPolicy.findFirst({ where: { isDefault: true } })
    const now = new Date()
    const slaResponseDue = defaultSla
      ? new Date(now.getTime() + defaultSla.responseTimeHours * 3600 * 1000)
      : new Date(now.getTime() + 4 * 3600 * 1000)
    const slaResolutionDue = defaultSla
      ? new Date(now.getTime() + defaultSla.resolutionTimeHours * 3600 * 1000)
      : new Date(now.getTime() + 24 * 3600 * 1000)

    // For Gmail tickets: Do NOT set device name, Kaseya, or Zoho Assist (only Zoho tickets have them)
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        subject,
        description: bodyContent,
        priority: 'MEDIUM',
        status: 'OPEN',
        source: 'EMAIL',
        deviceHostname: null,
        kaseyaData: undefined,
        department: assignedDepartmentId ? { connect: { id: assignedDepartmentId } } : undefined,
        customer: customer?.id ? { connect: { id: customer.id } } : undefined,
        requester: user?.id ? { connect: { id: user.id } } : undefined,
        slaPolicy: defaultSla?.id ? { connect: { id: defaultSla.id } } : undefined,
        slaResponseDue,
        slaResolutionDue,
        tags: ['email-inbound'],
      },
    })

    await prisma.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        userId: user?.id || ticket.id,
        action: 'CREATED',
        description: `Ticket created from incoming email sent by ${senderEmail}`,
      },
    })

    // Log inbound email into EmailLog
    await prisma.emailLog.create({
      data: {
        direction: 'INBOUND',
        from: rawFrom,
        to: recipientTo || 'support@parletech.com',
        subject,
        body: bodyContent,
        htmlBody: email.html,
        ticketId: ticket.id,
        ticketNumber,
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        status: 'DELIVERED',
      },
    }).catch(console.error)

    // Send auto-acknowledgement email
    try {
      const emailContent = ticketCreatedEmail({
        ticketNumber,
        subject,
        requesterName: senderName,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      })
      await sendEmail({
        to: senderEmail,
        ticketId: ticket.id,
        ticketNumber,
        direction: 'OUTBOUND',
        ...emailContent,
      })
    } catch (mailErr) {
      console.warn('Failed to send auto-reply confirmation email:', mailErr)
    }

    return {
      success: true,
      action: 'TICKET_CREATED',
      ticketId: ticket.id,
      ticketNumber,
    }
  } catch (error: any) {
    console.error('Error processing incoming email:', error)
    return { success: false, error: error.message }
  }
}
