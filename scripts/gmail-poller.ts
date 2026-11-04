import { pollGmailInbox } from '../src/lib/imap'

console.log('📬 ParleTech Gmail IMAP Auto-Poller initialized (every 30s)...')

async function poll() {
  try {
    const result = await pollGmailInbox()
    if (result.success && result.processedCount && result.processedCount > 0) {
      console.log(`\n🎉 [Gmail] Received ${result.processedCount} new email(s)!`)
      for (const item of (result.details || [])) {
        console.log(`   - Ticket ${item.ticketNumber}: "${item.subject}" from ${item.from}`)
      }
    }
  } catch (err: any) {
    // Only log if it is not an unconfigured error
    if (!err?.message?.includes('not configured')) {
      console.error('[Gmail Poll Error]:', err.message)
    }
  }
}

// Run immediately, then poll every 30 seconds
poll()
setInterval(poll, 30000)
