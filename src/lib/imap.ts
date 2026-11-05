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
  const [emailSetting, passSetting, hostSetting, portSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: 'gmail_email' } }),
    prisma.systemSetting.findUnique({ where: { key: 'gmail_app_password' } }),
    prisma.systemSetting.findUnique({ where: { key: 'imap_host' } }),
    prisma.systemSetting.findUnique({ where: { key: 'imap_port' } }),
  ])

  // Also check environment variables as fallback
  const user = emailSetting?.value || process.env.GMAIL_EMAIL || process.env.IMAP_USER
  const pass = passSetting?.value || process.env.GMAIL_APP_PASSWORD || process.env.IMAP_PASSWORD

  if (!user || !pass) {
    return null
  }

  return {
    host: hostSetting?.value || process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(portSetting?.value || process.env.IMAP_PORT || '993'),
    user,
    pass,
    secure: true,
  }
}

let isPolling = false

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
      error: 'Gmail/IMAP settings not configured. Please enter your Gmail address and App Password in Settings.',
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
  })

  const results: any[] = []

  try {
    await client.connect()

    // Check both INBOX and Spam so emails mistakenly flagged by Google filters aren't lost
    const targetFolders = ['INBOX', '[Gmail]/Spam']

    for (const folder of targetFolders) {
      try {
        const lock = await client.getMailboxLock(folder)
        try {
          const unseenUids = await client.search({ seen: false }, { uid: true })
          if (!unseenUids || unseenUids.length === 0) continue

          // Process the most recent unseen messages (up to 15 per folder)
          const targetUids = unseenUids.slice(-15)

          for (const uid of targetUids) {
            for await (const message of client.fetch(String(uid), { source: true, envelope: true, uid: true }, { uid: true })) {
              if (!message.source) continue

              const parsed = await simpleParser(message.source)

              const fromAddress = parsed.from?.text || parsed.from?.value?.[0]?.address || ''
              const subject = parsed.subject || '(No Subject)'
              const bodyText = parsed.text || ''
              const bodyHtml = parsed.html ? String(parsed.html) : undefined

              const res = await processIncomingEmail({
                from: fromAddress,
                subject,
                text: bodyText,
                html: bodyHtml,
                messageId: parsed.messageId,
                inReplyTo: parsed.inReplyTo,
                references: parsed.references,
              })

              results.push({
                folder,
                subject,
                from: fromAddress,
                action: res.action,
                ticketNumber: res.ticketNumber,
              })

              // Mark as seen so we don't process it again
              await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen'], { uid: true })
            }
          }
        } finally {
          lock.release()
        }
      } catch (folderErr: any) {
        console.warn(`Could not poll folder ${folder}:`, folderErr.message)
      }
    }

    await client.logout()

    return {
      success: true,
      processedCount: results.length,
      details: results,
    }
  } catch (err: any) {
    console.error('IMAP Poll Error:', err)
    return {
      success: false,
      error: err.message || 'Failed to connect to Gmail IMAP. Check your App Password.',
    }
  } finally {
    isPolling = false
  }
}
