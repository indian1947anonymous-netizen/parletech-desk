export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { pollGmailInbox } = await import('@/lib/imap')
      
      console.log('⚡ Next.js Real-time 3-Second Gmail Poller registered.')
      
      setTimeout(() => {
        pollGmailInbox()
          .then(res => {
            if (res?.processedCount && res.processedCount > 0) {
              console.log(`[Gmail 3s Poller] Grabbed ${res.processedCount} email(s) into tickets.`)
            }
          })
          .catch(err => console.error('[Gmail Poller Error]:', err.message))

        setInterval(() => {
          pollGmailInbox()
            .then(res => {
              if (res?.processedCount && res.processedCount > 0) {
                console.log(`[Gmail 3s Poller] ⚡ Grabbed ${res.processedCount} new email(s)!`)
              }
            })
            .catch(err => console.error('[Gmail Poller Error]:', err.message))
        }, 3000)
      }, 2000)
    } catch (err: any) {
      console.warn('Could not initialize Gmail Poller in instrumentation:', err.message)
    }
  }
}
