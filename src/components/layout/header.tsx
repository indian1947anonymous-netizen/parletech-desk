'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, Search, RefreshCw, Plus, ExternalLink,
  ShieldCheck, HelpCircle, Sparkles, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)

  const handleSyncLiveIntegrations = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/integrations/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to sync')
      toast.success(data.message || 'Zoho Desk & IT integrations synced successfully.')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error synchronizing integrations')
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
    <header className="h-14 bg-white border-b border-slate-200/80 flex items-center px-5 gap-3.5 flex-shrink-0 z-10 shadow-xs">
      {/* Global Search Bar (Zoho Desk Style) */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets, subject, engineer, customer (e.g. ZD-10033)..."
            className="pl-8.5 pr-14 h-8 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border-slate-200 text-xs rounded-lg transition-colors placeholder:text-slate-400"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <kbd className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded px-1 py-0.2 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </form>

      {/* Action Controls & Navigation Utilities */}
      <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
        {/* Zoho Portal Deep Link */}
        <a
          href="https://desk.zoho.com/agent/parletech"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 border border-slate-200/80 transition-colors"
          title="Open Parle Technologies Zoho Desk Agent Portal"
        >
          <ExternalLink className="w-3 h-3 text-slate-400" />
          <span>Zoho Desk Portal</span>
        </a>

        {/* Live Sync Trigger Button */}
        <button
          onClick={handleSyncLiveIntegrations}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          title="Trigger live sync with Zoho Desk API"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-800 hidden sm:inline">Zoho Live</span>
          <RefreshCw className={`h-3 w-3 text-slate-500 ${syncing ? 'animate-spin' : ''}`} />
        </button>

        {/* Zoho Desk Primary "+ New Ticket" Button */}
        <Button asChild size="sm" className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-xs transition-colors">
          <Link href="/tickets/new">
            <Plus className="h-3.5 w-3.5 mr-1" /> New Ticket
          </Link>
        </Button>

        {/* Notifications Bell */}
        <Link
          href="/notifications"
          className="relative p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-3.5 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full px-1">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
