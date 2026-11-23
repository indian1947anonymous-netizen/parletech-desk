'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition, useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Search, ShieldAlert, Filter, User, Building, Clock, Check, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  departments: { id: string; name: string }[]
  agents: { id: string; name: string | null }[]
}

export function TicketFilters({ departments, agents }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [syncingGmail, setSyncingGmail] = useState(false)

  const handleSyncGmail = async () => {
    setSyncingGmail(true)
    try {
      const res = await fetch('/api/email/poll', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        if (data.processedCount > 0) {
          toast.success(`Synced ${data.processedCount} new email(s) from Indian1947anonymous@gmail.com!`)
          router.refresh()
        } else {
          toast.info('Gmail is up to date (no new unread emails).')
        }
      } else {
        toast.error(data.error || 'Failed to sync Gmail')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSyncingGmail(false)
    }
  }

  // Auto-poll on component mount
  useEffect(() => {
    fetch('/api/email/poll', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d?.processedCount > 0) {
          toast.success(`Auto-synced ${d.processedCount} new email(s)!`)
          router.refresh()
        }
      })
      .catch(() => {})
  }, [router])

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    startTransition(() => {
      router.push(`/tickets?${params.toString()}`)
    })
  }, [router, searchParams])

  const setViewScope = (scope: string) => {
    const params = new URLSearchParams()
    if (scope === 'open') params.set('status', 'OPEN')
    else if (scope === 'progress') params.set('status', 'IN_PROGRESS')
    else if (scope === 'unassigned') params.set('agent', 'unassigned')
    else if (scope === 'vip') params.set('vip', 'vip')
    else if (scope === 'resolved') params.set('status', 'RESOLVED')
    else if (scope === 'closed') params.set('status', 'CLOSED')
    else if (scope === 'hold') params.set('status', 'ON_HOLD')

    params.set('page', '1')
    startTransition(() => {
      router.push(`/tickets?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    startTransition(() => {
      router.push('/tickets')
    })
  }

  const currentStatus = searchParams.get('status')
  const currentAgent = searchParams.get('agent')
  const currentVip = searchParams.get('vip')

  const isAll = !currentStatus && !currentAgent && !currentVip
  const isOpen = currentStatus === 'OPEN'
  const isProgress = currentStatus === 'IN_PROGRESS'
  const isUnassigned = currentAgent === 'unassigned'
  const isVipOnly = currentVip === 'vip'
  const isHold = currentStatus === 'ON_HOLD'
  const isResolved = currentStatus === 'RESOLVED'
  const isClosed = currentStatus === 'CLOSED'

  const hasFilters = searchParams.has('status') ||
    searchParams.has('priority') ||
    searchParams.has('search') ||
    searchParams.has('department') ||
    searchParams.has('agent') ||
    searchParams.has('vip') ||
    searchParams.has('company') ||
    searchParams.has('sla')

  return (
    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
      {/* Zoho Desk Signature Quick Queue Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs select-none">
        <button
          onClick={() => setViewScope('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            isAll
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          All Tickets (500)
        </button>

        <button
          onClick={() => setViewScope('open')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            isOpen
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          Open
        </button>

        <button
          onClick={() => setViewScope('progress')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            isProgress
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          In Progress (20)
        </button>

        <button
          onClick={() => setViewScope('unassigned')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1 ${
            isUnassigned
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <span>⚠️ Unassigned (17)</span>
        </button>

        <button
          onClick={() => setViewScope('vip')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1 ${
            isVipOnly
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          <span>VIP Priority (13)</span>
        </button>

        <button
          onClick={() => setViewScope('hold')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            isHold
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          On Hold (6)
        </button>

        <button
          onClick={() => setViewScope('resolved')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            isResolved
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          Resolved (45)
        </button>

        <button
          onClick={() => setViewScope('closed')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            isClosed
              ? 'bg-slate-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          Closed (429)
        </button>
      </div>

      {/* Filter Dropdowns & Field Searches */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search tickets, subjects, requesters, IDs..."
            defaultValue={searchParams.get('search') || ''}
            onChange={e => updateFilter('search', e.target.value)}
            className="h-8 pl-8 text-xs bg-slate-50 hover:bg-white focus:bg-white border-slate-200 rounded-lg transition-colors placeholder:text-slate-400"
          />
        </div>

        {/* Engineer Filter */}
        <Select
          value={searchParams.get('agent') || 'all'}
          onValueChange={v => updateFilter('agent', v)}
        >
          <SelectTrigger className="w-[145px] h-8 text-xs bg-slate-50 border-slate-200 rounded-lg">
            <User className="w-3 h-3 text-slate-400 mr-1" />
            <SelectValue placeholder="All Engineers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Engineers</SelectItem>
            <SelectItem value="unassigned">⚠️ Unassigned Tickets (17)</SelectItem>
            {agents.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name || 'Unknown'}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Company / Department Filter */}
        <Select
          value={searchParams.get('company') || 'all'}
          onValueChange={v => updateFilter('company', v)}
        >
          <SelectTrigger className="w-[155px] h-8 text-xs bg-slate-50 border-slate-200 rounded-lg">
            <Building className="w-3 h-3 text-slate-400 mr-1" />
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Better Lending">Better Lending</SelectItem>
            <SelectItem value="Parle Technologies">Parle Technologies</SelectItem>
            <SelectItem value="SkyBridge Resources">SkyBridge Resources</SelectItem>
            <SelectItem value="CCE">CCE</SelectItem>
            <SelectItem value="ELIO">ELIO</SelectItem>
            <SelectItem value="Skybridge Aviation">Skybridge Aviation</SelectItem>
            <SelectItem value="Skybridge Healthcare">Skybridge Healthcare</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={searchParams.get('priority') || 'all'}
          onValueChange={v => updateFilter('priority', v)}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-50 border-slate-200 rounded-lg">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Reset Filters
          </Button>
        )}

        {/* Sync Gmail Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleSyncGmail}
          disabled={syncingGmail}
          className="h-8 px-3 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 ml-auto flex items-center gap-1.5 shadow-xs"
          title="Check Indian1947anonymous@gmail.com for new tickets or customer replies"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncingGmail ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
          <span>{syncingGmail ? 'Checking Gmail...' : 'Sync Gmail'}</span>
        </Button>
      </div>
    </div>
  )
}
