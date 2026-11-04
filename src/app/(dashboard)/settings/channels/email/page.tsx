'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Mail, Plus, ArrowLeft, Copy, Check, CheckCircle2, AlertCircle,
  ExternalLink, Trash2, RefreshCw, Send, ShieldCheck, HelpCircle,
  Inbox, ArrowUpRight, ArrowDownLeft, Eye, X, Terminal, Server
} from 'lucide-react'
import { toast } from 'sonner'

export default function ZohoDeskEmailChannelsPage() {
  const [activeTab, setActiveTab] = useState<'channels' | 'simulator' | 'logs' | 'guide'>('channels')
  const [channels, setChannels] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [emailLogs, setEmailLogs] = useState<any[]>([])
  const [logCounts, setLogCounts] = useState({ total: 0, inbound: 0, outbound: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null)

  // Channel Form State
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [protocol, setProtocol] = useState<'FORWARDING' | 'IMAP'>('FORWARDING')
  const [imapHost, setImapHost] = useState('imap.gmail.com')
  const [imapPort, setImapPort] = useState('993')
  const [imapPassword, setImapPassword] = useState('')
  const [submittingChannel, setSubmittingChannel] = useState(false)

  // Simulator Form State
  const [simSenderName, setSimSenderName] = useState('Alex Johnson')
  const [simSenderEmail, setSimSenderEmail] = useState('alex.johnson@partnercorp.com')
  const [simRecipient, setSimRecipient] = useState('support@parletech.com')
  const [simSubject, setSimSubject] = useState('VPN connection failing for remote design team')
  const [simBody, setSimBody] = useState('Hello IT Support team,\n\nOur design team cannot connect to the internal VPN server since this morning.\nError code: SEC_TLS_FAIL.\n\nPlease help as soon as possible.\n\nThanks,\nAlex Johnson')
  const [simSending, setSimSending] = useState(false)
  const [simResult, setSimResult] = useState<any | null>(null)

  // Filter for Logs
  const [logFilter, setLogFilter] = useState<'ALL' | 'INBOUND' | 'OUTBOUND'>('ALL')

  // Load channels and departments
  const loadChannelsAndDepts = async () => {
    try {
      const [chanRes, deptRes] = await Promise.all([
        fetch('/api/support-emails'),
        fetch('/api/departments'),
      ])
      const chanData = await chanRes.json()
      const deptData = await deptRes.json()

      if (chanData.supportEmails) {
        setChannels(chanData.supportEmails)
        if (chanData.supportEmails.length > 0 && !simRecipient) {
          setSimRecipient(chanData.supportEmails[0].email)
        }
      }
      if (deptData.departments) setDepartments(deptData.departments)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Load email logs
  const loadLogs = async () => {
    setLoadingLogs(true)
    try {
      const url = logFilter === 'ALL' ? '/api/email/logs' : `/api/email/logs?direction=${logFilter}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.logs) {
        setEmailLogs(data.logs)
        setLogCounts({
          total: data.totalCount || 0,
          inbound: data.inboundCount || 0,
          outbound: data.outboundCount || 0,
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    loadChannelsAndDepts()
    loadLogs()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [logFilter])

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

    setSubmittingChannel(true)
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
      loadChannelsAndDepts()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmittingChannel(false)
    }
  }

  const handleDeleteChannel = async (id: string, chEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${chEmail}?`)) return
    try {
      const res = await fetch(`/api/support-emails?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete channel')
      toast.success(`Removed support email ${chEmail}`)
      setChannels(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Handle Employee Email Simulation
  const handleSimulateInboundEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!simSenderEmail || !simRecipient || !simSubject || !simBody) {
      toast.error('Please fill in all email fields')
      return
    }

    setSimSending(true)
    setSimResult(null)
    try {
      const formattedFrom = `"${simSenderName}" <${simSenderEmail}>`
      const res = await fetch('/api/email/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: formattedFrom,
          to: simRecipient,
          subject: simSubject,
          text: simBody,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to simulate inbound email')

      setSimResult(data)
      toast.success(`Ticket ${data.ticketNumber || 'created'} generated from inbound email!`)
      loadLogs()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSimSending(false)
    }
  }

  const applyPreset = (preset: 'vpn' | 'laptop' | 'reply') => {
    if (preset === 'vpn') {
      setSimSenderName('Alex Johnson')
      setSimSenderEmail('alex.johnson@partnercorp.com')
      setSimSubject('VPN connection failing for remote design team')
      setSimBody('Hello IT Support,\n\nOur design team cannot connect to the internal VPN server since this morning. Error code: SEC_TLS_FAIL.\n\nPlease help ASAP.\n\nThanks,\nAlex')
    } else if (preset === 'laptop') {
      setSimSenderName('Sarah Jenkins')
      setSimSenderEmail('sarah.jenkins@company.com')
      setSimSubject('Request for external 4K monitor and USB-C hub')
      setSimBody('Hi IT Team,\n\nI recently joined the marketing team and need an additional 4K display and USB-C hub for video editing.\n\nManager approved: Yes.\n\nThank you,\nSarah')
    } else if (preset === 'reply') {
      setSimSenderName('Alex Johnson')
      setSimSenderEmail('alex.johnson@partnercorp.com')
      setSimSubject('Re: [TKT-0007] VPN connection failing for remote design team')
      setSimBody('Thank you John! I updated the OpenVPN client and the TLS handshake succeeded. We are all back online now.\n\nYou can close this ticket.\n\nBest,\nAlex')
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Mail className="w-7 h-7 text-blue-600" />
              Email Channels & Mail Simulator
            </h1>
          </div>
          <p className="text-sm text-slate-500 ml-8">
            Zoho Desk-style support email routing, agent identity replies, and interactive employee mail simulator.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'simulator' ? 'default' : 'outline'}
            onClick={() => setActiveTab('simulator')}
            className="gap-2 font-semibold"
          >
            <Send className="w-4 h-4" />
            Employee Simulator
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700 font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Support Email
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('channels')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'channels'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mail className="w-4 h-4" />
          Support Email Addresses ({channels.length})
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'simulator'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          Employee Mail Simulator
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Outbox & Inbound Email Trail ({logCounts.total})
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'guide'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Zoho Desk Architecture Guide
        </button>
      </div>

      {/* TAB 1: SUPPORT EMAIL CHANNELS */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-lg">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Active Channels</p>
                  <p className="text-2xl font-bold text-slate-900">{channels.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/50 border-emerald-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-lg">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Local SMTP Daemon</p>
                  <p className="text-sm font-bold text-slate-900">Active on Port 2525</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-indigo-50/50 border-indigo-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-lg">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Total Emails Logged</p>
                  <p className="text-2xl font-bold text-slate-900">{logCounts.total}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Configured Support Email Channels
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Emails sent by employees to these addresses create tickets routed to the assigned department.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadChannelsAndDepts} className="gap-1.5 h-8">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">Loading support emails...</div>
              ) : channels.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Mail className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No support email addresses configured</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Add a support email like support@parletech.com to start converting incoming emails into tickets.
                  </p>
                  <Button onClick={() => setShowAddModal(true)} size="sm" className="mt-2">
                    <Plus className="w-4 h-4 mr-1" /> Add Support Email
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {channels.map((chan) => (
                    <div key={chan.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-sm text-slate-900">{chan.displayName}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                            {chan.email}
                          </span>
                          {chan.department && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                              Dept: {chan.department.name}
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-slate-400">Desk Forwarding Address:</span>
                          <code className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono border border-slate-200">
                            {chan.forwardingAddress}
                          </code>
                          <button
                            onClick={() => handleCopy(chan.forwardingAddress, chan.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Copy forwarding address"
                          >
                            {copiedId === chan.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSimRecipient(chan.email)
                            setActiveTab('simulator')
                          }}
                          className="h-8 gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <Send className="w-3.5 h-3.5" /> Test Inbound
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteChannel(chan.id, chan.email)}
                          className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: EMPLOYEE MAIL SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  Simulate Incoming Employee Email
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Test how employee emails convert into support tickets in real-time without needing external Gmail passwords.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6">
                <form onSubmit={handleSimulateInboundEmail} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2">
                    <span className="text-xs font-semibold text-slate-500">Quick Test Templates:</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('vpn')} className="h-7 text-xs">
                      VPN Failure (New Ticket)
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('laptop')} className="h-7 text-xs">
                      Hardware Request
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('reply')} className="h-7 text-xs">
                      Reply to Ticket TKT-0007
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Employee Sender Name</Label>
                      <Input
                        value={simSenderName}
                        onChange={e => setSimSenderName(e.target.value)}
                        placeholder="e.g. Alex Johnson"
                        className="h-9"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Employee Email Address</Label>
                      <Input
                        type="email"
                        value={simSenderEmail}
                        onChange={e => setSimSenderEmail(e.target.value)}
                        placeholder="e.g. alex.johnson@partnercorp.com"
                        className="h-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">To: Support Email Channel</Label>
                    <Select value={simRecipient} onValueChange={setSimRecipient}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select Support Email" />
                      </SelectTrigger>
                      <SelectContent>
                        {channels.map((chan) => (
                          <SelectItem key={chan.id} value={chan.email}>
                            {chan.displayName} ({chan.email})
                          </SelectItem>
                        ))}
                        {channels.length === 0 && (
                          <SelectItem value="support@parletech.com">
                            ParleTech Support (support@parletech.com)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Subject Line</Label>
                    <Input
                      value={simSubject}
                      onChange={e => setSimSubject(e.target.value)}
                      placeholder="e.g. VPN connection failing or Re: [TKT-0001]..."
                      className="h-9 font-medium"
                      required
                    />
                    <p className="text-[11px] text-slate-400">
                      Include <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono">Re: [TKT-XXXX]</code> to thread as a customer reply on an existing ticket.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Email Message Body</Label>
                    <Textarea
                      rows={5}
                      value={simBody}
                      onChange={e => setSimBody(e.target.value)}
                      placeholder="Type the message that the employee sent..."
                      className="text-sm font-sans resize-y"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={simSending}
                    className="w-full h-10 font-semibold bg-blue-600 hover:bg-blue-700 gap-2 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    {simSending ? 'Dispatching Inbound Email...' : '⚡ Send Email as Employee to Desk'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {simResult && (
              <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm animate-in fade-in">
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Email Received & Processed Successfully!
                    </p>
                    <p className="text-xs text-emerald-700">
                      Action: <strong>{simResult.action}</strong> • Ticket: <strong>{simResult.ticketNumber}</strong>
                    </p>
                  </div>
                  <Link
                    href={`/tickets/${simResult.ticketId || simResult.ticketNumber}`}
                    className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                  >
                    Open Ticket & Reply <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right helper panel */}
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-600" />
                  Local SMTP Port 2525
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-3">
                <p>
                  An embedded SMTP server is actively running on <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">localhost:2525</code>.
                </p>
                <p>
                  You can also send real emails directly from any terminal or mail tool:
                </p>
                <div className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-[11px] overflow-x-auto space-y-1">
                  <p className="text-slate-400"># Send via curl / nc:</p>
                  <p className="text-emerald-400">curl -X POST http://localhost:3000/api/email/inbound \</p>
                  <p className="text-slate-300"> -H "Content-Type: application/json" \</p>
                  <p className="text-slate-300"> -d '&#123;"from":"alex@corp.com","to":"support@parletech.com","subject":"Help","text":"Issue"&#125;'</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-slate-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Agent Identity Replies
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <p>
                  When an agent (e.g. <strong>John Agent</strong>) views a ticket and clicks reply:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li><strong>From:</strong> "John Agent (ParleTech Desk)" &lt;john@parletech.com&gt;</li>
                  <li><strong>Reply-To:</strong> support@parletech.com</li>
                  <li><strong>Subject:</strong> Re: [TKT-XXXX] Subject</li>
                </ul>
                <p className="text-[11px] text-slate-500 pt-1">
                  Every reply is automatically logged to the Sent Outbox with the agent's name.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: OUTBOX & INBOUND EMAIL AUDIT TRAIL */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <Button
                variant={logFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLogFilter('ALL')}
                className="h-8 text-xs font-semibold"
              >
                All Emails ({logCounts.total})
              </Button>
              <Button
                variant={logFilter === 'OUTBOUND' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLogFilter('OUTBOUND')}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Sent by Agents ({logCounts.outbound})
              </Button>
              <Button
                variant={logFilter === 'INBOUND' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLogFilter('INBOUND')}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Received from Employees ({logCounts.inbound})
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={loadingLogs}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Direction</th>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Sender (From)</th>
                    <th className="py-3 px-4">Recipient (To)</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Agent</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No emails logged yet. Use the Employee Simulator to send test emails.
                      </td>
                    </tr>
                  ) : (
                    emailLogs.map((log) => {
                      const isOut = log.direction === 'OUTBOUND'
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                isOut
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isOut ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                              {isOut ? 'OUTBOUND' : 'INBOUND'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                            {log.ticketNumber ? (
                              <Link href={`/tickets/${log.ticketId || log.ticketNumber}`} className="hover:underline">
                                {log.ticketNumber}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 max-w-[200px] truncate" title={log.from}>
                            {log.from}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate" title={log.to}>
                            {log.to}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 max-w-[250px] truncate" title={log.subject}>
                            {log.subject}
                          </td>
                          <td className="py-3 px-4">
                            {log.agentName ? (
                              <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {log.agentName}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                            {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEmail(log)}
                              className="h-7 px-2 text-xs font-semibold text-slate-600 hover:text-blue-600 gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: ZOHO DESK ARCHITECTURE GUIDE */}
      {activeTab === 'guide' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              How Zoho Desk Support Email Architecture Works in Production
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Clear explanation of why Google passwords are not used and how production email routing functions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-slate-700">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                1. Inbound Routing via Forwarding (Not Password Sync)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                In real Zoho Desk, customers never type personal passwords into the app. Instead, companies configure an email forwarding rule in their email server (Google Workspace, Office 365, or cPanel) from their support address (<code className="bg-white px-1.5 py-0.5 rounded border font-mono">support@company.com</code>) to the unique Desk forwarding address (<code className="bg-white px-1.5 py-0.5 rounded border font-mono">desk-support-xxxx@parletech.desk-mail.com</code>).
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                When an employee emails support, the email is automatically forwarded to Desk and parsed into a ticket.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                2. Outbound Agent Replies (From John Agent)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                When an agent (e.g. John Agent) clicks "Public Reply" in the dashboard:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                <li>Desk sets the sender name: <code className="bg-white px-1.5 py-0.5 rounded border font-mono">From: "John Agent (ParleTech Desk)" &lt;john@parletech.com&gt;</code></li>
                <li>Desk sets the Reply-To header to the support address so subsequent replies stay in the thread.</li>
                <li>The email is transmitted through the system's outbound SMTP relay and logged in the Sent Outbox audit trail.</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                3. Local Testing & Verification
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                To enable testing without registering real public DNS domain records:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                <li><strong>Employee Simulator:</strong> Instantly sends inbound emails from any employee email directly into Desk.</li>
                <li><strong>Embedded SMTP Port 2525:</strong> Listens for SMTP connections from terminal tools or test scripts.</li>
                <li><strong>Sent Outbox:</strong> Displays full agent reply emails with exact headers and rendered formatting.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VIEW EMAIL MODAL */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedEmail.direction === 'OUTBOUND'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedEmail.direction === 'OUTBOUND' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                  {selectedEmail.direction}
                </span>
                <span className="font-semibold text-sm text-slate-900 truncate max-w-md">
                  {selectedEmail.subject}
                </span>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 border-b border-slate-100 space-y-2 text-xs bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 w-16">From:</span>
                <span className="font-semibold text-slate-800">{selectedEmail.from}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 w-16">To:</span>
                <span className="font-medium text-slate-800">{selectedEmail.to}</span>
              </div>
              {selectedEmail.replyTo && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-16">Reply-To:</span>
                  <span className="font-mono text-slate-600">{selectedEmail.replyTo}</span>
                </div>
              )}
              {selectedEmail.agentName && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-16">Agent:</span>
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {selectedEmail.agentName} ({selectedEmail.agentEmail || 'agent'})
                  </span>
                </div>
              )}
              {selectedEmail.ticketNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-16">Ticket:</span>
                  <Link
                    href={`/tickets/${selectedEmail.ticketId || selectedEmail.ticketNumber}`}
                    className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {selectedEmail.ticketNumber} <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {selectedEmail.htmlBody ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
                />
              ) : (
                <div className="font-sans text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedEmail.body}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedEmail(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CHANNEL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Add Support Email Channel</h3>
                <p className="text-xs text-slate-500">Configure a department support address like Zoho Desk</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Support Email Address</Label>
                <Input
                  type="email"
                  placeholder="e.g. support@parletech.com, it-helpdesk@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Display Name</Label>
                <Input
                  placeholder="e.g. ParleTech IT Help Desk, Customer Support"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Assigned Department</Label>
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
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-slate-700">Integration Method</Label>
                <Select value={protocol} onValueChange={(v: any) => setProtocol(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FORWARDING">Email Forwarding (Zoho Desk Standard)</SelectItem>
                    <SelectItem value="IMAP">Direct Fetching (Gmail IMAP App Password)</SelectItem>
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
                <Button type="submit" disabled={submittingChannel} className="h-9 font-semibold bg-blue-600 hover:bg-blue-700">
                  {submittingChannel ? 'Creating...' : 'Add Support Email'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
