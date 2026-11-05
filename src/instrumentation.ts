export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { pollGmailInbox } = await import('@/lib/imap')
      
      console.log('📬 Next.js Background Gmail Poller registered.')
      
      setTimeout(() => {
        pollGmailInbox()
          .then(res => {
            if (res?.processedCount && res.processedCount > 0) {
              console.log(`[Gmail Poller] Converted ${res.processedCount} email(s) into tickets.`)
            }
          })
          .catch(err => console.error('[Gmail Poller Error]:', err.message))

        setInterval(() => {
          pollGmailInbox()
            .then(res => {
              if (res?.processedCount && res.processedCount > 0) {
                console.log(`[Gmail Poller] Converted ${res.processedCount} email(s) into tickets.`)
              }
            })
            .catch(err => console.error('[Gmail Poller Error]:', err.message))
        }, 45000)
      }, 10000)
    } catch (err: any) {
      console.warn('Could not initialize Gmail Poller in instrumentation:', err.message)
    }
  }
}
