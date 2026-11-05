'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, RefreshCw, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string
  }
  notificationCount?: number
}

export function Header({ user, notificationCount = 0 }: HeaderProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)

  const handleSyncGmail = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/email/poll', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to poll Gmail')
      const count = data.processedCount || 0
      if (count > 0) {
        toast.success(`🎉 Received ${count} new email(s)! Converted to tickets.`)
        router.refresh()
      } else {
        toast.info('Gmail inbox & spam are up to date. No new unread messages.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error checking Gmail')
    } finally {
      setSyncing(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/tickets?search=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets, customers..."
            className="pl-9 h-8 bg-slate-50 border-slate-200 text-sm"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {user.role !== 'END_USER' && (
          <>
            <button
              onClick={handleSyncGmail}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-sm"
              title="Poll Gmail inbox & spam for new tickets"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{syncing ? 'Checking...' : 'Sync Gmail'}</span>
            </button>

            <a
              href="/settings/channels/email"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Email Simulator & Outbox
            </a>
          </>
        )}

        <a href="/notifications" className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="h-4 w-4 text-slate-600" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-0.5">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </a>

        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-900 leading-tight">{user.name || 'User'}</p>
          <p className="text-xs text-slate-500 leading-tight">{user.role?.replace(/_/g, ' ')}</p>
        </div>
      </div>
    </header>
  )
}
