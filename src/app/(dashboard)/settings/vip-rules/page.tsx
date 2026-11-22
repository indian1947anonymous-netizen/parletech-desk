'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldAlert, Plus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function VipRulesPage() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [matchType, setMatchType] = useState('JOB_TITLE')
  const [pattern, setPattern] = useState('')
  const [priority, setPriority] = useState(1)
  const [description, setDescription] = useState('')

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/vip-rules')
      const json = await res.json()
      if (json.rules) setRules(json.rules)
    } catch (e: any) {
      toast.error('Failed to load VIP rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  const handleToggle = async (rule: any) => {
    try {
      const res = await fetch('/api/vip-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive })
      })
      if (!res.ok) throw new Error('Update failed')
      toast.success(`Rule "${rule.name}" ${!rule.isActive ? 'activated' : 'deactivated'}`)
      fetchRules()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this VIP rule?')) return
    try {
      const res = await fetch(`/api/vip-rules?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('VIP rule deleted')
      fetchRules()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !pattern.trim()) {
      toast.error('Please enter a rule name and matching pattern')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/vip-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          matchType,
          pattern,
          priority: Number(priority),
          description
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Creation failed')
      toast.success('New VIP rule created successfully')
      setName('')
      setPattern('')
      setDescription('')
      fetchRules()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">VIP Identification & Priority Rules</h1>
            <Badge className="bg-red-600 text-white font-extrabold text-xs">
              <ShieldAlert className="w-3 h-3 mr-1 inline" /> Policy Engine
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure rules that automatically identify VIP requesters and flag tickets with RED VIP priority badges
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules List (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Active VIP Priority Rules</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Tickets matching any active rule receive the RED VIP badge and top dashboard placement
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {rules.length} Rules Configured
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{rule.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            rule.isActive
                              ? 'bg-red-50 text-red-700 border-red-300 font-bold text-[10px]'
                              : 'bg-slate-100 text-slate-500 text-[10px]'
                          }
                        >
                          {rule.isActive ? 'ACTIVE' : 'DISABLED'}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Type: {rule.matchType} • Priority: {rule.priority}
                        </span>
                      </div>
                      <div className="text-xs font-mono bg-slate-100 text-slate-800 px-2 py-1 rounded inline-block">
                        Match Pattern: {rule.pattern}
                      </div>
                      {rule.description && (
                        <p className="text-xs text-slate-500 pt-0.5">{rule.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(rule)}
                        className={`h-8 text-xs ${
                          rule.isActive
                            ? 'text-amber-700 border-amber-200 hover:bg-amber-50'
                            : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {rule.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add New Rule Form (Right Column) */}
        <div>
          <Card className="border-red-200 shadow-sm bg-gradient-to-b from-red-50/30 to-white">
            <CardHeader className="py-4 px-5 border-b border-red-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-red-600" /> Create VIP Identification Rule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Rule Name</label>
                  <Input
                    placeholder="e.g. Legal & Compliance Executives"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Match Criterion</label>
                  <Select value={matchType} onValueChange={setMatchType}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JOB_TITLE">Job Title (e.g. CEO, MD, VP)</SelectItem>
                      <SelectItem value="EMAIL">Email Address (exact or substring)</SelectItem>
                      <SelectItem value="DEPARTMENT">Department (e.g. HR, C-Suite)</SelectItem>
                      <SelectItem value="COMPANY">Company / Organization</SelectItem>
                      <SelectItem value="DOMAIN">Email Domain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Match Pattern (Use | for OR)</label>
                  <Input
                    placeholder="e.g. VP|Director|Chief"
                    value={pattern}
                    onChange={e => setPattern(e.target.value)}
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Evaluation Priority</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={priority}
                    onChange={e => setPriority(Number(e.target.value))}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Description / Rationale</label>
                  <Input
                    placeholder="Reason for VIP classification..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={creating}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-9 mt-2"
                >
                  {creating ? 'Saving...' : 'Add VIP Priority Rule'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
