'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Search } from 'lucide-react'

interface Props {
  departments: { id: string; name: string }[]
  agents: { id: string; name: string | null }[]
}

export function TicketFilters({ departments, agents }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

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

  const clearFilters = () => {
    startTransition(() => {
      router.push('/tickets')
    })
  }

  const hasFilters = searchParams.has('status') ||
    searchParams.has('priority') ||
    searchParams.has('search') ||
    searchParams.has('department') ||
    searchParams.has('agent')

  return (
    <div className="flex flex-wrap items-center gap-2.5 bg-white p-3.5 rounded-lg border border-slate-200">
      <div className="relative min-w-[200px] flex-1 sm:flex-initial">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Filter by keyword / #..."
          defaultValue={searchParams.get('search') || ''}
          onChange={e => updateFilter('search', e.target.value)}
          className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
        />
      </div>

      <Select
        value={searchParams.get('status') || 'all'}
        onValueChange={v => updateFilter('status', v)}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-50 border-slate-200">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="OPEN">Open</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="WAITING_FOR_CUSTOMER">Waiting on Customer</SelectItem>
          <SelectItem value="WAITING_FOR_THIRD_PARTY">Waiting on 3rd Party</SelectItem>
          <SelectItem value="ON_HOLD">On Hold</SelectItem>
          <SelectItem value="RESOLVED">Resolved</SelectItem>
          <SelectItem value="CLOSED">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('priority') || 'all'}
        onValueChange={v => updateFilter('priority', v)}
      >
        <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-50 border-slate-200">
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

      <Select
        value={searchParams.get('department') || 'all'}
        onValueChange={v => updateFilter('department', v)}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-50 border-slate-200">
          <SelectValue placeholder="All Depts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Depts</SelectItem>
          {departments.map(d => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('agent') || 'all'}
        onValueChange={v => updateFilter('agent', v)}
      >
        <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-50 border-slate-200">
          <SelectValue placeholder="All Agents" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Agents</SelectItem>
          {agents.map(a => (
            <SelectItem key={a.id} value={a.id}>{a.name || 'Unknown'}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800">
          <X className="h-3 w-3 mr-1" /> Reset
        </Button>
      )}
    </div>
  )
}
