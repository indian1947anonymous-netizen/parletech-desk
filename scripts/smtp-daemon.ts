import { SMTPServer } from 'smtp-server'
import { simpleParser } from 'mailparser'
import { processIncomingEmail } from '../src/lib/email-to-ticket'

const PORT = parseInt(process.env.SMTP_LISTEN_PORT || '2525', 10)

const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ['STARTTLS'],
  onAuth(auth, session, callback) {
    // Allow any or no auth for local/forwarded reception
    return callback(null, { user: auth.username || 'anonymous' })
  },
  onData(stream, session, callback) {
    simpleParser(stream as any, async (err, parsed) => {
      if (err) {
        console.error('[SMTP Daemon] Error parsing incoming email:', err)
        return callback(err)
      }

      try {
        const from = parsed.from?.text || parsed.from?.value?.[0]?.address || ''
        const to = parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(', ') : parsed.to.text) : ''
        const subject = parsed.subject || '(No Subject)'
        const text = parsed.text || ''
        const html = typeof parsed.html === 'string' ? parsed.html : undefined

        console.log(`\n[SMTP Daemon] 📬 Inbound Email Received on port ${PORT}:`)
        console.log(`  From: ${from}`)
        console.log(`  To: ${to}`)
        console.log(`  Subject: ${subject}`)

        const result = await processIncomingEmail({
          from,
          to,
          subject,
          text,
          html,
          messageId: parsed.messageId,
          inReplyTo: parsed.inReplyTo,
        })

        console.log(`  Result: ${JSON.stringify(result)}\n`)
        callback()
      } catch (procErr: any) {
        console.error('[SMTP Daemon] Error processing incoming email:', procErr)
        callback(procErr)
      }
    })
  },
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`)
  console.log(`🚀 ParleTech Embedded SMTP Receiver Running on port ${PORT}`)
  console.log(`   Employees can send email via SMTP to localhost:${PORT}`)
  console.log(`======================================================\n`)
})

server.on('error', (err) => {
  console.error('[SMTP Daemon Error]:', err)
})
