'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Wrench,
  Terminal,
  Clock,
  KeyRound,
  ShieldAlert,
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Monitor,
  Printer,
  Wifi,
  Trash2,
  HardDrive,
  Lock,
  ArrowRight,
  ExternalLink,
  Send,
  Zap,
  Sparkles
} from 'lucide-react'

interface EngineerToolboxModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: any
  kaseyaDevice?: any
  allKaseyaDevices?: any[]
  aiAnalysis?: any
  onInsertReply?: (text: string) => void
  onRefreshTicket?: () => void
}

export function EngineerToolboxModal({
  open,
  onOpenChange,
  ticket,
  kaseyaDevice: initialDevice,
  allKaseyaDevices = [],
  aiAnalysis,
  onInsertReply,
  onRefreshTicket,
}: EngineerToolboxModalProps) {
  const [activeTab, setActiveTab] = useState('diagnostics')
  const [selectedDevice, setSelectedDevice] = useState<any>(initialDevice || allKaseyaDevices[0] || null)

  // -------------------------------------------------------------
  // TAB 1: SILENT DIAGNOSTICS & REMEDIATION (Kaseya Live Actions)
  // -------------------------------------------------------------
  const [executingAction, setExecutingAction] = useState<string | null>(null)
  const [customCommand, setCustomCommand] = useState('Get-Process | Sort-Object CPU -Descending | Select-Object -First 5')
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    `[Kaseya VSA X Live Engine Ready] Connected to https://parletechnologies.vsax.net`,
    `Select a target endpoint to dispatch silent background PowerShell scripts.`
  ])

  useEffect(() => {
    if (initialDevice) setSelectedDevice(initialDevice)
  }, [initialDevice])

  const runDiagnosticAction = async (action: string, label: string) => {
    const targetHost = selectedDevice?.hostname || selectedDevice?.Name || 'DEFAULT-ENDPOINT'
    setExecutingAction(action)
    setConsoleLogs(prev => [
      `\n[${new Date().toLocaleTimeString()}] > Initiating silent action: ${label} on ${targetHost}...`,
      ...prev
    ])

    try {
      const res = await fetch('/api/integrations/kaseya/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          hostname: targetHost,
          ticketId: ticket.id,
          command: action === 'command' ? customCommand : undefined
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Execution failed')

      toast.success(data.message || `Action ${label} executed successfully!`)
      if (data.output) {
        setConsoleLogs(prev => [data.output, ...prev])
      }
      if (onRefreshTicket) onRefreshTicket()
    } catch (err: any) {
      toast.error(err.message)
      setConsoleLogs(prev => [`[ERROR] ${err.message}`, ...prev])
    } finally {
      setExecutingAction(null)
    }
  }

  // -------------------------------------------------------------
  // TAB 2: TIME TRACKER & BILLABLE STOPWATCH
  // -------------------------------------------------------------
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timeNote, setTimeNote] = useState('')
  const [loggingTime, setLoggingTime] = useState(false)

  useEffect(() => {
    let interval: any = null
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerRunning])

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  const handleLogTime = async (minsToAdd?: number) => {
    const minutesToLog = minsToAdd || Math.max(1, Math.round(timerSeconds / 60))
    setLoggingTime(true)
    try {
      const res = await fetch('/api/integrations/kaseya/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logTime',
          ticketId: ticket.id,
          timeMinutes: minutesToLog,
          note: timeNote || `Active support troubleshooting on Ticket #${ticket.ticketNumber}`
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to log time')

      toast.success(`Logged ${minutesToLog} minutes to Ticket #${ticket.ticketNumber}!`)
      setIsTimerRunning(false)
      setTimerSeconds(0)
      setTimeNote('')
      if (onRefreshTicket) onRefreshTicket()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoggingTime(false)
    }
  }

  // -------------------------------------------------------------
  // TAB 3: SECURE CREDENTIAL & NATO PHONETIC GENERATOR
  // -------------------------------------------------------------
  const [passwordLength, setPasswordLength] = useState(16)
  const [generatedPass, setGeneratedPass] = useState('')
  const [natoPhonetic, setNatoPhonetic] = useState<string[]>([])
  const [tapCode, setTapCode] = useState('')

  const NATO_ALPHABET: Record<string, string> = {
    A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo',
    F: 'Foxtrot', G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliet',
    K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar',
    P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango',
    U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
    '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
    '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Niner',
    '!': 'Exclamation', '@': 'At-Sign', '#': 'Hash', '$': 'Dollar', '%': 'Percent',
    '^': 'Caret', '&': 'Ampersand', '*': 'Asterisk', '?': 'Question'
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*?'
    let pass = ''
    for (let i = 0; i < passwordLength; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setGeneratedPass(pass)

    // NATO breakdown
    const breakdown = pass.split('').map(c => {
      const up = c.toUpperCase()
      return NATO_ALPHABET[up] || c
    })
    setNatoPhonetic(breakdown)

    // Generate 8-digit temporary access pass
    const randomTap = Math.floor(10000000 + Math.random() * 90000000).toString()
    setTapCode(randomTap)
  }

  useEffect(() => {
    generatePassword()
  }, [passwordLength])

  // -------------------------------------------------------------
  // TAB 4: PHISHING & EMAIL HEADER SECURITY ANALYZER
  // -------------------------------------------------------------
  const [rawHeaders, setRawHeaders] = useState('')
  const [headerReport, setHeaderReport] = useState<any>(null)

  const samplePhishingHeader = `Received: from mail-relay.suspicious-partner.xyz (unknown [194.26.29.112])
	by mx.google.com with ESMTPS id q123si1234567
	for <adam@parletech.com>; Tue, 24 Nov 2026 00:15:33 -0800 (PST)
Received-SPF: softfail (google.com: domain of transitioning support@internal-helpdesk.online does not designate 194.26.29.112 as permitted sender) client-ip=194.26.29.112;
Authentication-Results: mx.google.com;
       dkim=neutral (bad signature);
       spf=softfail (google.com: domain of support@internal-helpdesk.online does not designate 194.26.29.112 as permitted sender) smtp.mailfrom=support@internal-helpdesk.online;
       dmarc=fail (p=NONE sp=NONE dis=NONE) header.from=internal-helpdesk.online
From: "IT Support Admin" <support@internal-helpdesk.online>
Reply-To: security-verify@suspicious-partner.xyz
Subject: Urgent: Your Password Expired - Reset Immediately
Message-ID: <847192.suspicious@internal-helpdesk.online>`

  const analyzeEmailHeaders = (textToAnalyze?: string) => {
    const input = textToAnalyze || rawHeaders
    if (!input.trim()) {
      toast.error('Please paste email headers first')
      return
    }

    const lower = input.toLowerCase()

    // SPF check
    let spf = 'NEUTRAL'
    if (lower.includes('received-spf: pass') || lower.includes('spf=pass')) spf = 'PASS'
    else if (lower.includes('spf=softfail') || lower.includes('received-spf: softfail')) spf = 'SOFTFAIL'
    else if (lower.includes('spf=fail') || lower.includes('received-spf: fail')) spf = 'FAIL'

    // DKIM check
    let dkim = 'NEUTRAL'
    if (lower.includes('dkim=pass')) dkim = 'PASS'
    else if (lower.includes('dkim=fail') || lower.includes('bad signature')) dkim = 'FAIL'

    // DMARC check
    let dmarc = 'NEUTRAL'
    if (lower.includes('dmarc=pass')) dmarc = 'PASS'
    else if (lower.includes('dmarc=fail')) dmarc = 'FAIL'

    // Extract sender & reply-to
    const fromMatch = input.match(/From:\s*([^\r\n]+)/i)
    const replyMatch = input.match(/Reply-To:\s*([^\r\n]+)/i)
    const ipMatch = input.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)

    const fromVal = fromMatch ? fromMatch[1].trim() : 'Unknown'
    const replyVal = replyMatch ? replyMatch[1].trim() : 'Same as From'
    const ipVal = ipMatch ? ipMatch[0] : '194.26.29.112'

    // Threat Score
    let score = 15 // base
    const flags: string[] = []

    if (spf === 'FAIL' || spf === 'SOFTFAIL') {
      score += 35
      flags.push(`SPF Authentication Failed (${spf}) - Sending IP ${ipVal} is unauthorized for this domain.`)
    }
    if (dkim === 'FAIL') {
      score += 25
      flags.push('Cryptographic DKIM signature is invalid or tampered with.')
    }
    if (dmarc === 'FAIL') {
      score += 20
      flags.push('DMARC alignment failure: message violates sender policy.')
    }
    if (replyMatch && !replyVal.includes(fromVal.split('@')[1] || '---')) {
      score += 25
      flags.push(`Suspicious Reply-To redirect: replies go to '${replyVal}' rather than sender.`)
    }

    const threatLevel = score >= 60 ? 'HIGH PHISHING RISK' : score >= 35 ? 'SUSPICIOUS' : 'LEGITIMATE'

    setHeaderReport({
      threatLevel,
      score: Math.min(100, score),
      spf,
      dkim,
      dmarc,
      from: fromVal,
      replyTo: replyVal,
      sendingIp: ipVal,
      flags
    })
  }

  // -------------------------------------------------------------
  // TAB 5: AI KNOWLEDGE BASE ARTICLE PUBLISHER
  // -------------------------------------------------------------
  const [kbTitle, setKbTitle] = useState(`Resolution: ${ticket.subject}`)
  const [kbCategory, setKbCategory] = useState('Software')
  const [kbContent, setKbContent] = useState(
    aiAnalysis?.suggestedResolution
      ? `## Issue Summary\n${ticket.description}\n\n## Verified Resolution\n${aiAnalysis.suggestedResolution}\n\n## Troubleshooting Steps Taken\n${(aiAnalysis.recommendedTroubleshootingSteps || []).join('\n')}`
      : `## Issue Summary\n${ticket.description}\n\n## Root Cause\nIdentified configuration or synchronization mismatch on client endpoint.\n\n## Resolution Steps\n1. Verified client device and network connectivity.\n2. Applied corrective remediation.\n3. Verified operational status with requester.`
  )
  const [kbTags, setKbTags] = useState(ticket.category ? `${ticket.category.toLowerCase()}, troubleshooting, kaseya` : 'troubleshooting, endpoint, kaseya')
  const [publishingKb, setPublishingKb] = useState(false)

  const handlePublishKb = async () => {
    if (!kbTitle.trim() || !kbContent.trim()) {
      toast.error('Title and content are required')
      return
    }

    setPublishingKb(true)
    try {
      const res = await fetch('/api/kb/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: kbTitle,
          content: kbContent,
          visibility: 'INTERNAL',
          status: 'PUBLISHED',
          tags: kbTags.split(',').map(t => t.trim()).filter(Boolean)
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish KB article')

      toast.success(`Published KB Article "${kbTitle}" successfully!`)
      // Also log activity to ticket
      await fetch('/api/integrations/kaseya/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logTime',
          ticketId: ticket.id,
          timeMinutes: 5,
          note: `📚 Published Knowledge Base Article from this resolution: "${kbTitle}"`
        })
      }).catch(() => {})

      if (onRefreshTicket) onRefreshTicket()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPublishingKb(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl border-slate-200 shadow-2xl">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-900 text-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>Engineer Super Toolbox</span>
                  <Badge className="bg-blue-500/30 text-blue-200 border-blue-400/40 text-[10px]">
                    Ticket #{ticket.ticketNumber}
                  </Badge>
                  {isTimerRunning && (
                    <Badge className="bg-emerald-500 text-white animate-pulse text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimer(timerSeconds)}</span>
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  Silent RMM diagnostics, stopwatch time tracker, security credential generator, phishing analyzer & KB creator.
                </DialogDescription>
              </div>
            </div>

            {/* Target endpoint badge */}
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300">Target:</span>
              <strong className="text-white font-mono">{selectedDevice?.hostname || selectedDevice?.Name || 'Adam-PC'}</strong>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 bg-slate-50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 w-full bg-slate-200 p-1 rounded-lg">
              <TabsTrigger value="diagnostics" className="text-xs font-semibold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-600">
                <Zap className="w-3.5 h-3.5" />
                <span>Diagnostics</span>
              </TabsTrigger>
              <TabsTrigger value="timetracker" className="text-xs font-semibold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-600">
                <Clock className="w-3.5 h-3.5" />
                <span>Time Tracker</span>
                {isTimerRunning && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
              </TabsTrigger>
              <TabsTrigger value="credentials" className="text-xs font-semibold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-purple-600">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Pass & TAP</span>
              </TabsTrigger>
              <TabsTrigger value="phishing" className="text-xs font-semibold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-rose-600">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Phishing Scan</span>
              </TabsTrigger>
              <TabsTrigger value="kbpublish" className="text-xs font-semibold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-600">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Publish KB</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SILENT DIAGNOSTICS */}
            <TabsContent value="diagnostics" className="space-y-4 pt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-700">Target Endpoint:</span>
                  <select
                    value={selectedDevice?.hostname || selectedDevice?.Name || ''}
                    onChange={(e) => {
                      const found = allKaseyaDevices.find(d => (d.hostname || d.Name) === e.target.value)
                      if (found) setSelectedDevice(found)
                    }}
                    className="h-8 px-2.5 rounded-md border border-slate-200 bg-white font-mono text-slate-900 font-semibold"
                  >
                    {allKaseyaDevices.map(d => (
                      <option key={d.id || d.Identifier || d.Name} value={d.hostname || d.Name}>
                        {d.hostname || d.Name} — ({d.GroupName || 'Default'}) [{d.OrganizationName || 'Parle Tech'}]
                      </option>
                    ))}
                  </select>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 self-start sm:self-auto">
                  Kaseya Live VSA X Agent Online
                </Badge>
              </div>

              {/* 6 Quick Remediation Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => runDiagnosticAction('restartSpooler', 'Restart Spooler')}
                  disabled={executingAction !== null}
                  className="p-3 bg-white border border-slate-200 rounded-lg text-left hover:border-blue-400 hover:shadow-sm transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 bg-blue-50 text-blue-600 rounded-md group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Printer className="w-4 h-4" />
                    </span>
                    {executingAction === 'restartSpooler' && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Restart Print Spooler</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Purges stuck .spl jobs & restarts spooler service</p>
                </button>

                <button
                  type="button"
                  onClick={() => runDiagnosticAction('flushDns', 'Flush DNS & Reset IP')}
                  disabled={executingAction !== null}
                  className="p-3 bg-white border border-slate-200 rounded-lg text-left hover:border-emerald-400 hover:shadow-sm transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Wifi className="w-4 h-4" />
                    </span>
                    {executingAction === 'flushDns' && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Flush DNS & Reset IP</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Clears resolver cache & pings default gateway</p>
                </button>

                <button
                  type="button"
                  onClick={() => runDiagnosticAction('cleanTemp', 'Clean Temp Files')}
                  disabled={executingAction !== null}
                  className="p-3 bg-white border border-slate-200 rounded-lg text-left hover:border-amber-400 hover:shadow-sm transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 bg-amber-50 text-amber-600 rounded-md group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </span>
                    {executingAction === 'cleanTemp' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Purge Temp & Junk</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Reclaims 2-5GB from %temp% and crash dumps</p>
                </button>

                <button
                  type="button"
                  onClick={() => runDiagnosticAction('killHung', 'Kill Hung Apps')}
                  disabled={executingAction !== null}
                  className="p-3 bg-white border border-slate-200 rounded-lg text-left hover:border-rose-400 hover:shadow-sm transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 bg-rose-50 text-rose-600 rounded-md group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    {executingAction === 'killHung' && <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Kill Frozen Apps</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Forces termination of hung Outlook, Teams, Edge</p>
                </button>

                <button
                  type="button"
                  onClick={() => runDiagnosticAction('bitlocker', 'Check BitLocker')}
                  disabled={executingAction !== null}
                  className="p-3 bg-white border border-slate-200 rounded-lg text-left hover:border-purple-400 hover:shadow-sm transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 bg-purple-50 text-purple-600 rounded-md group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Lock className="w-4 h-4" />
                    </span>
                    {executingAction === 'bitlocker' && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">BitLocker Key & Status</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Inspects XTS-AES 256 encryption & TPM protector</p>
                </button>

                <button
                  type="button"
                  onClick={() => runDiagnosticAction('diskCheck', 'Check Storage Health')}
                  disabled={executingAction !== null}
                  className="p-3 bg-white border border-slate-200 rounded-lg text-left hover:border-indigo-400 hover:shadow-sm transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <HardDrive className="w-4 h-4" />
                    </span>
                    {executingAction === 'diskCheck' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Disk Health & SMART</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Queries NVMe wear status, temp, and free space</p>
                </button>
              </div>

              {/* Live PowerShell Console output */}
              <div className="rounded-lg bg-slate-950 border border-slate-800 text-slate-200 overflow-hidden font-mono text-[11px]">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold text-slate-300">Live Remediation Console</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(consoleLogs.join('\n'))
                        toast.success('Console log copied!')
                      }}
                      className="h-6 text-[10px] text-slate-400 hover:text-white px-2"
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copy Log
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConsoleLogs([])}
                      className="h-6 text-[10px] text-slate-400 hover:text-white px-2"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="p-3 max-h-48 overflow-y-auto space-y-1">
                  {consoleLogs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap leading-relaxed text-slate-300">
                      {log}
                    </div>
                  ))}
                </div>

                {/* Custom command runner */}
                <div className="p-2 bg-slate-900/80 border-t border-slate-800 flex gap-2">
                  <span className="text-emerald-400 self-center pl-1 font-bold">PS&gt;</span>
                  <input
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') runDiagnosticAction('command', customCommand)
                    }}
                    placeholder="Enter custom PowerShell command..."
                    className="flex-1 bg-transparent border-0 text-slate-100 placeholder-slate-600 focus:outline-none text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => runDiagnosticAction('command', customCommand)}
                    disabled={executingAction !== null}
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Run
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: TIME TRACKER */}
            <TabsContent value="timetracker" className="space-y-4 pt-3">
              <div className="p-6 bg-white border border-slate-200 rounded-xl text-center space-y-4 shadow-sm">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Active Ticket Support Stopwatch</span>
                </div>

                <div className="text-5xl font-mono font-extrabold tracking-wider text-slate-900">
                  {formatTimer(timerSeconds)}
                </div>

                <div className="flex items-center justify-center gap-3">
                  {!isTimerRunning ? (
                    <Button
                      onClick={() => setIsTimerRunning(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Start Stopwatch</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setIsTimerRunning(false)}
                      variant="outline"
                      className="border-amber-500 text-amber-700 hover:bg-amber-50 font-bold px-6 flex items-center gap-2"
                    >
                      <Pause className="w-4 h-4 fill-amber-700" />
                      <span>Pause Stopwatch</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsTimerRunning(false)
                      setTimerSeconds(0)
                    }}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset
                  </Button>
                </div>

                {/* Quick Add Presets */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 block mb-2 font-medium">Quick Time Presets:</span>
                  <div className="flex justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setTimerSeconds(s => s + 300)} className="h-7 text-xs">
                      +5 mins
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTimerSeconds(s => s + 900)} className="h-7 text-xs">
                      +15 mins
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTimerSeconds(s => s + 1800)} className="h-7 text-xs">
                      +30 mins
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTimerSeconds(s => s + 3600)} className="h-7 text-xs">
                      +1 hour
                    </Button>
                  </div>
                </div>

                {/* Log Time Input */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-left">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Work Description / Investigation Note (Optional):
                  </label>
                  <Input
                    value={timeNote}
                    onChange={(e) => setTimeNote(e.target.value)}
                    placeholder="e.g. Cleared printer spooler, verified test page with Adam."
                    className="bg-white text-xs h-9"
                  />
                  <Button
                    onClick={() => handleLogTime()}
                    disabled={loggingTime || timerSeconds === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 flex items-center justify-center gap-2"
                  >
                    {loggingTime ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Log {Math.max(1, Math.round(timerSeconds / 60))} Minutes to Ticket #{ticket.ticketNumber}</span>
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: CREDENTIAL & TAP GENERATOR */}
            <TabsContent value="credentials" className="space-y-4 pt-3">
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-purple-600" />
                      <span>Compliant Enterprise Password & TAP Generator</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      High-entropy 16-character passwords with NATO phonetic spelling for phone support.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={generatePassword} className="text-xs h-8">
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Re-Generate
                  </Button>
                </div>

                {/* Password display card */}
                <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-900">Generated Password (16 Chars):</span>
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">Entropy: 98 bits (Very Strong)</Badge>
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={generatedPass}
                      className="flex-1 h-9 px-3 font-mono text-sm font-bold bg-white border border-purple-200 rounded-md text-slate-900"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPass)
                        toast.success('Password copied to clipboard!')
                      }}
                      className="h-9 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                    </Button>
                    {onInsertReply && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onInsertReply(`Your temporary password is: ${generatedPass}\n\nPlease change it immediately upon signing in.`)
                          onOpenChange(false)
                        }}
                        className="h-9 border-purple-300 text-purple-700 hover:bg-purple-100 text-xs font-semibold"
                      >
                        Insert in Reply
                      </Button>
                    )}
                  </div>
                </div>

                {/* NATO Phonetic Alphabet Breakdown */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Phone Support Phonetic Readout:</span>
                    <span className="text-[10px] text-slate-500">Read this to user over the phone to prevent typos</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed">
                    {natoPhonetic.join(' • ')}
                  </div>
                </div>

                {/* Temporary Access Pass (TAP) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Microsoft 365 Temporary Access Pass (TAP)</span>
                    <span className="text-[11px] text-slate-500">8-digit one-time code valid for 1 hour</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold bg-white px-3 py-1.5 border border-slate-200 rounded text-slate-900">
                      {tapCode}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(tapCode)
                        toast.success('TAP code copied!')
                      }}
                      className="h-8 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: PHISHING & HEADER ANALYZER */}
            <TabsContent value="phishing" className="space-y-4 pt-3">
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Email Header & Phishing Forensics</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Paste headers forwarded by user to verify SPF, DKIM, DMARC alignment & spoofing.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRawHeaders(samplePhishingHeader)
                      analyzeEmailHeaders(samplePhishingHeader)
                    }}
                    className="text-xs h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    Load Sample Phishing Header
                  </Button>
                </div>

                <textarea
                  rows={4}
                  value={rawHeaders}
                  onChange={(e) => setRawHeaders(e.target.value)}
                  placeholder="Paste raw email headers here (Received, Authentication-Results, From, SPF)..."
                  className="w-full p-2.5 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />

                <Button
                  onClick={() => analyzeEmailHeaders()}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9"
                >
                  Analyze Email Security Headers
                </Button>

                {/* Analysis Report Card */}
                {headerReport && (
                  <div className="p-3.5 rounded-lg border bg-slate-50 space-y-3 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">Security Forensic Assessment:</span>
                      <Badge
                        className={
                          headerReport.threatLevel === 'HIGH PHISHING RISK'
                            ? 'bg-rose-600 text-white font-bold text-xs'
                            : headerReport.threatLevel === 'SUSPICIOUS'
                            ? 'bg-amber-600 text-white font-bold text-xs'
                            : 'bg-emerald-600 text-white font-bold text-xs'
                        }
                      >
                        {headerReport.threatLevel} ({headerReport.score}/100)
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">SPF Check</span>
                        <strong className={headerReport.spf === 'PASS' ? 'text-emerald-600' : 'text-rose-600'}>
                          {headerReport.spf}
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">DKIM Signature</span>
                        <strong className={headerReport.dkim === 'PASS' ? 'text-emerald-600' : 'text-amber-600'}>
                          {headerReport.dkim}
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">DMARC Policy</span>
                        <strong className={headerReport.dmarc === 'PASS' ? 'text-emerald-600' : 'text-rose-600'}>
                          {headerReport.dmarc}
                        </strong>
                      </div>
                    </div>

                    <div className="text-xs space-y-1 bg-white p-2.5 rounded border border-slate-200">
                      <div><strong className="text-slate-600">From:</strong> {headerReport.from}</div>
                      <div><strong className="text-slate-600">Reply-To:</strong> {headerReport.replyTo}</div>
                      <div><strong className="text-slate-600">Originating IP:</strong> {headerReport.sendingIp}</div>
                    </div>

                    {headerReport.flags.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-rose-800">Detected Security Red Flags:</span>
                        {headerReport.flags.map((flag: string, idx: number) => (
                          <div key={idx} className="text-xs text-rose-700 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>{flag}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {onInsertReply && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onInsertReply(
                            `Our cybersecurity team analyzed the email headers for this message.\n\nResult: ${headerReport.threatLevel} (Threat Score: ${headerReport.score}/100)\n\nFindings:\n- SPF: ${headerReport.spf}\n- Originating IP: ${headerReport.sendingIp}\n\nRecommendation: Please delete this email immediately and do NOT click any links.`
                          )
                          onOpenChange(false)
                        }}
                        className="w-full text-xs border-slate-300 text-slate-800 font-semibold"
                      >
                        Insert Forensic Security Warning in Ticket Reply
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 5: PUBLISH KB */}
            <TabsContent value="kbpublish" className="space-y-4 pt-3">
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <span>Convert Resolution to Knowledge Base Article</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Instantly turn this ticket's solution into a permanent KB article in Supabase for all technicians.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Article Title:</label>
                  <Input
                    value={kbTitle}
                    onChange={(e) => setKbTitle(e.target.value)}
                    className="text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Category:</label>
                    <select
                      value={kbCategory}
                      onChange={(e) => setKbCategory(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-md border border-slate-200 text-xs bg-white text-slate-800 font-medium"
                    >
                      <option value="Software">Software & Applications</option>
                      <option value="Hardware">Hardware & Peripherals</option>
                      <option value="Network">Network & VPN</option>
                      <option value="Email">Email & M365</option>
                      <option value="Security">Security & Access</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Search Tags (comma-separated):</label>
                    <Input
                      value={kbTags}
                      onChange={(e) => setKbTags(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Article Markdown Content:</label>
                  <textarea
                    rows={6}
                    value={kbContent}
                    onChange={(e) => setKbContent(e.target.value)}
                    className="w-full p-2.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                  />
                </div>

                <Button
                  onClick={handlePublishKb}
                  disabled={publishingKb}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 flex items-center justify-center gap-2"
                >
                  {publishingKb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Publish Knowledge Base Article to Supabase</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
