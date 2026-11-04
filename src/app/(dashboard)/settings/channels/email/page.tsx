'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Mail, Plus, ArrowLeft, Copy, Check, CheckCircle2, AlertCircle,
  ExternalLink, Trash2, RefreshCw, Send, ShieldCheck, HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'

export default function ZohoDeskEmailChannelsPage() {
  const [channels, setChannels] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form State
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [protocol, setProtocol] = useState<'FORWARDING' | 'IMAP'>('FORWARDING')
  const [imapHost, setImapHost] = useState('imap.gmail.com')
  const [imapPort, setImapPort] = useState('993')
  const [imapPassword, setImapPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load channels and departments
  const loadData = async () => {
    try {
      const [chanRes, deptRes] = await Promise.all([
        fetch('/api/support-emails'),
        fetch('/api/departments'),
      ])
      const chanData = await chanRes.json()
      const deptData = await deptRes.json()

      if (chanData.supportEmails) setChannels(chanData.supportEmails)
      if (deptData.departments) setDepartments(deptData.departments)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !displayName.trim()) {
      toast.error('Please enter support email and display name')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/support-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          displayName: displayName.trim(),
          departmentId: departmentId || undefined,
          protocol,
          imapHost: protocol === 'IMAP' ? imapHost : undefined,
          imapPort: protocol === 'IMAP' ? parseInt(imapPort) : undefined,
          imapUsername: protocol === 'IMAP' ? email.trim() : undefined,
          imapPassword: protocol === 'IMAP' ? imapPassword.trim() : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add support email')

      toast.success(`Support email ${email} added successfully!`)
      setShowAddModal(false)
      setEmail('')
      setDisplayName('')
      setDepartmentId('')
      setImapPassword('')
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return
    try {
      const res = await fetch(`/api/support-emails?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Support email removed')
      setChannels(prev => prev.filter(c => c.id !== id))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Settings
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Channels &gt; Support Email Addresses</h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
              Zoho Desk Standard
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure support email addresses for your team. Incoming emails automatically create tickets in the designated department.
          </p>
        </div>

        <Button onClick={() => setShowAddModal(true)} size="sm" className="font-semibold shadow-sm">
          <Plus className="h-4 w-4 mr-1.5" /> Add Support Email
        </Button>
      </div>

      {/* How it Works Banner (Zoho Desk Pattern) */}
      <Card className="border-blue-200 bg-blue-50/60 shadow-sm">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
            <Mail className="h-4 w-4 text-blue-600" />
            How Email-to-Ticket Works in Zoho Desk &amp; ParleTech:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
            <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs space-y-1">
              <span className="font-bold text-blue-800">1. Add Your Support Email</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Add <code>support@yourcompany.com</code> or your Gmail and pick which Department receives the tickets.
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs space-y-1">
              <span className="font-bold text-blue-800">2. Set Up Auto-Forwarding</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                In Gmail / Outlook, forward incoming emails to your unique system forwarding address or webhook.
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs space-y-1">
              <span className="font-bold text-blue-800">3. Automatic Ticket Creation</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Desk receives the email, matches the sender, creates a ticket, sets SLAs, and sends an acknowledgement!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Emails Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Configured Support Email Addresses</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {channels.length} active email support channel{channels.length === 1 ? '' : 's'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadData} className="h-8 text-xs text-slate-500">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Support Email &amp; Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Department</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Desk Forwarding Address</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {channels.map((chan) => (
                  <tr key={chan.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900 text-sm">{chan.email}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{chan.displayName}</p>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        {chan.department?.name || 'General Support'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <code className="bg-slate-100 px-2 py-1 rounded text-[11px] font-mono text-slate-800 select-all max-w-[200px] truncate">
                          {chan.forwardingAddress}
                        </code>
                        <button
                          onClick={() => handleCopy(chan.forwardingAddress, chan.id)}
                          title="Copy forwarding address"
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                        >
                          {copiedId === chan.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {chan.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Active &amp; Verified
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertCircle className="h-3 w-3" /> Setup Forwarding
                          </span>
                          {chan.verificationCode && (
                            <p className="text-[10px] text-slate-500 font-mono">
                              Code: <strong>{chan.verificationCode}</strong>
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(chan.id, chan.email)}
                        className="h-8 px-2 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}

                {channels.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <Mail className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-sm text-slate-700">No support email addresses added yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Click "Add Support Email" to connect your Gmail or company email address to the desk.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gmail Step-by-Step Forwarding Guide */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-4 px-6 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            Step-by-Step: How to Forward Your Gmail to ParleTech Desk
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-xs text-slate-700 space-y-3">
          <ol className="list-decimal list-inside space-y-2 leading-relaxed">
            <li>
              Add your email address above (e.g. <code>mycompany.support@gmail.com</code>) and click <strong>Add Support Email</strong>.
            </li>
            <li>
              Copy the generated <strong>Desk Forwarding Address</strong> from the table above.
            </li>
            <li>
              Open your <strong>Gmail</strong> &gt; click the <strong>Gear icon</strong> (Settings) &gt; <strong>See all settings</strong>.
            </li>
            <li>
              Click the <strong>Forwarding and POP/IMAP</strong> tab &gt; click <strong>Add a forwarding address</strong>.
            </li>
            <li>
              Paste the copied Desk Forwarding Address &gt; click <strong>Next &gt; Proceed &gt; OK</strong>.
            </li>
            <li>
              Select <strong>"Forward a copy of incoming mail to..."</strong> and click <strong>Save Changes</strong> at the bottom of the page.
            </li>
          </ol>
          <div className="pt-2">
            <span className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-md border border-slate-200 block">
              💡 <strong>Tip:</strong> If you use Google Workspace, you can also set up a default routing rule in Google Admin Console under <em>Apps &gt; Google Workspace &gt; Gmail &gt; Routing</em>.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Add Support Email Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Support Email Address</h3>
                  <p className="text-xs text-slate-500">Configure an email channel for ticket generation</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Support Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. support@company.com or your.gmail@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs font-semibold text-slate-700">
                  Display Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="displayName"
                  placeholder="e.g. ParleTech IT Help Desk, Customer Support"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Assigned Department
                </Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Department to receive tickets" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Tickets generated from emails sent to this address will be routed to this department.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-slate-700">Integration Method</Label>
                <Select value={protocol} onValueChange={(v: any) => setProtocol(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FORWARDING">Email Forwarding (Recommended - Zoho Desk Standard)</SelectItem>
                    <SelectItem value="IMAP">Direct Fetching (Gmail IMAP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {protocol === 'IMAP' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">IMAP Server</Label>
                      <Input value={imapHost} onChange={e => setImapHost(e.target.value)} className="h-8 text-xs font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Port</Label>
                      <Input value={imapPort} onChange={e => setImapPort(e.target.value)} className="h-8 text-xs font-mono" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">Google App Password (16 chars)</Label>
                    <Input
                      type="password"
                      placeholder="abcd efgh ijkl mnop"
                      value={imapPassword}
                      onChange={e => setImapPassword(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="h-9">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-9 font-semibold">
                  {submitting ? 'Creating...' : 'Add Support Email'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
