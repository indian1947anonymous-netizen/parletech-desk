import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { prisma } from '@/lib/db'
import { processIncomingEmail } from '@/lib/email-to-ticket'

interface ImapConfig {
  host: string
  port: number
  user: string
  pass: string
  secure: boolean
}

export async function getImapConfig(): Promise<ImapConfig | null> {
  const user = process.env.GMAIL_EMAIL || process.env.IMAP_USER || 'Indian1947anonymous@gmail.com'
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.IMAP_PASSWORD || 'uulqzjqhfzugvunk'

  if (!user || !pass) {
    return null
  }

  return {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993'),
    user,
    pass,
    secure: true,
  }
}

let isPolling = false

// Senders that are automated system/dev alerts and should not generate help desk tickets
const IGNORED_AUTOMATED_SENDERS = [
  'no-reply@render.com',
  'notifications@vercel.com',
  'mailer-daemon@googlemail.com',
  'mailer-daemon@gmail.com',
  'writersupport@medium.com',
]

export async function pollGmailInbox() {
  if (isPolling) {
    return { success: true, processedCount: 0, skipped: true }
  }
  isPolling = true

  const config = await getImapConfig()
  if (!config) {
    isPolling = false
    return {
      success: false,
      error: 'Gmail/IMAP settings not configured.',
    }
  }

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    logger: false,
    emitLogs: false,
  })

  // Prevent uncaught errors on socket
  client.on('error', (err) => {
    console.warn('[Gmail IMAP Socket Warning]:', err?.message || err)
  })

  const rawMessagesToProcess: Array<{ source: Buffer; folder: string }> = []
  const results: any[] = []

  try {
    await client.connect()

    // 1. Fetch recent logged message IDs to prevent duplicate processing
    const existingLogs = await prisma.emailLog.findMany({
      where: { messageId: { not: null } },
      select: { messageId: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    }).catch(() => [])
    const loggedMessageIds = new Set(existingLogs.map(l => l.messageId).filter(Boolean))

    const lock = await client.getMailboxLock('INBOX')
    try {
      const status = await client.status('INBOX', { messages: true })
      const totalMessages = (status && typeof status === 'object' && status.messages) ? status.messages : 0

      if (totalMessages > 0) {
        // Fetch newest 25 messages
        const startSeq = Math.max(1, totalMessages - 25)
        const fetchRange = `${startSeq}:*`

        for await (const message of client.fetch(fetchRange, { source: true, flags: true, uid: true, envelope: true })) {
          const msgId = message.envelope?.messageId
          const sender = message.envelope?.from?.[0]?.address?.toLowerCase() || ''

          // Skip if from our own mailbox
          if (sender === config.user.toLowerCase()) {
            continue
          }

          // Skip known automated notification spams
          if (IGNORED_AUTOMATED_SENDERS.some(ign => sender.includes(ign))) {
            continue
          }

          // If this email was already processed and logged into the database, skip
          if (msgId && loggedMessageIds.has(msgId)) {
            continue
          }

          // If message has source, queue for processing
          if (message.source) {
            rawMessagesToProcess.push({
              source: Buffer.from(message.source),
              folder: 'INBOX'
            })
            // Mark as seen on IMAP
            await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen'], { uid: true }).catch(() => {})
          }
        }
      }
    } finally {
      lock.release()
    }

    // Safely disconnect IMAP before processing and sending replies
    await client.logout().catch(() => {})

    // Process all downloaded messages outside of IMAP lock
    for (const item of rawMessagesToProcess) {
      try {
        const parsed = await simpleParser(item.source)

        const fromAddress = parsed.from?.text || parsed.from?.value?.[0]?.address || ''
        const subject = parsed.subject || '(No Subject)'
        const bodyText = parsed.text || ''
        const bodyHtml = parsed.html ? String(parsed.html) : undefined

        const res = await processIncomingEmail({
          from: fromAddress,
          to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to.text) : config.user,
          subject,
          text: bodyText,
          html: bodyHtml,
          messageId: parsed.messageId,
          inReplyTo: parsed.inReplyTo,
          references: parsed.references,
        })

        results.push({
          folder: item.folder,
          subject,
          from: fromAddress,
          action: res.action,
          ticketNumber: res.ticketNumber,
        })
      } catch (procErr: any) {
        console.error('Error processing parsed email:', procErr)
      }
    }

    return {
      success: true,
      processedCount: results.length,
      details: results,
    }
  } catch (err: any) {
    console.error('IMAP Poll Error:', err)
    return {
      success: false,
      error: err.message || 'Failed to connect to Gmail IMAP.',
    }
  } finally {
    isPolling = false
  }
}
