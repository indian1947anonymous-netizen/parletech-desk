'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, RefreshCw, Key, CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'

export function EmailIntegration() {
  const [gmailEmail, setGmailEmail] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [imapHost, setImapHost] = useState('imap.gmail.com')
  const [imapPort, setImapPort] = useState('993')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<any>(null)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    fetch('/api/settings/email')
      .then(res => res.json())
      .then(data => {
        if (data.gmail_email) setGmailEmail(data.gmail_email)
        if (data.imap_host) setImapHost(data.imap_host)
        if (data.imap_port) setImapPort(data.imap_port)
        if (data.hasPasswordConfigured) setHasPassword(true)
      })
      .catch(console.error)
  }, [])

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gmailEmail.trim() || (!appPassword.trim() && !hasPassword)) {
      toast.error('Please enter both your Gmail address and 16-character App Password')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmail_email: gmailEmail.trim(),
          gmail_app_password: appPassword.trim(),
          imap_host: imapHost.trim(),
          imap_port: imapPort.trim(),
          auto_poll: true,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save configuration')

      toast.success('Gmail settings saved and connection verified!')
      setHasPassword(true)
      setAppPassword('')
      if (json.testResult) {
        setLastSyncResult(json.testResult)
      }
    } catch (err: any) {
      toast.error(err.message || 'Connection test failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/email/poll', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to poll inbox')

      setLastSyncResult(json)
      const count = json.processedCount || 0
      toast.success(
        count > 0
          ? `Inbox sync complete! Converted ${count} email(s) into tickets.`
          : 'Inbox is up to date. No new unread support emails found.'
      )
    } catch (err: any) {
      toast.error(err.message || 'Error syncing inbox')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm md:col-span-2">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Gmail & Inbound Email-to-Ticket Integration
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Automatically convert emails sent to your Gmail inbox into support tickets with threading
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncNow}
              disabled={syncing || !hasPassword}
              className="h-8 text-xs font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
              {syncing ? 'Checking Inbox...' : 'Check & Sync Inbox Now'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Help Banner */}
        <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-900 flex items-center gap-1.5">
              <Key className="h-4 w-4 text-blue-600" />
              How to Connect Your Gmail in 2 Minutes:
            </span>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-blue-700 underline font-semibold hover:text-blue-900"
            >
              {showHelp ? 'Hide Instructions' : 'View Step-by-Step Guide'}
            </button>
          </div>

          {showHelp && (
            <ol className="list-decimal list-inside space-y-1.5 pt-2 text-slate-700 border-t border-blue-100 mt-2">
              <li>
                Open your <strong>Google Account Settings</strong> at{' '}
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-semibold inline-flex items-center"
                >
                  myaccount.google.com/security <ExternalLink className="h-3 w-3 ml-0.5 inline" />
                </a>
              </li>
              <li>Ensure <strong>2-Step Verification</strong> is enabled on your Google account.</li>
              <li>
                Search for <strong>"App passwords"</strong> in the top search bar (or visit{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline font-semibold inline-flex items-center"
                >
                  myaccount.google.com/apppasswords <ExternalLink className="h-3 w-3 ml-0.5 inline" />
                </a>
                ).
              </li>
              <li>Type an app name like <code>ParleTech Desk</code> and click <strong>Create</strong>.</li>
              <li>Copy the generated <strong>16-character App Password</strong> (e.g. <code>xxxx yyyy zzzz wwww</code>) and paste it below.</li>
            </ol>
          )}
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveAndTest} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gmailEmail" className="text-xs font-semibold text-slate-700">
                Your Gmail Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="gmailEmail"
                type="email"
                placeholder="your.support@gmail.com"
                value={gmailEmail}
                onChange={e => setGmailEmail(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appPassword" className="text-xs font-semibold text-slate-700">
                16-Character Google App Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="appPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={hasPassword ? '•••••••••••••••• (Configured)' : 'e.g. abcd efgh ijkl mnop'}
                  value={appPassword}
                  onChange={e => setAppPassword(e.target.value)}
                  className="h-9 font-mono pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="imapHost" className="text-xs font-semibold text-slate-700">IMAP Server Host</Label>
              <Input
                id="imapHost"
                value={imapHost}
                onChange={e => setImapHost(e.target.value)}
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="imapPort" className="text-xs font-semibold text-slate-700">IMAP Port (SSL/TLS)</Label>
              <Input
                id="imapPort"
                value={imapPort}
                onChange={e => setImapPort(e.target.value)}
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs">
              {hasPassword ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Gmail Connection Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5" /> Gmail Not Yet Connected
                </span>
              )}
            </div>

            <Button type="submit" disabled={saving} className="h-9 text-xs font-semibold">
              {saving ? 'Testing & Saving...' : 'Save & Verify Connection'}
            </Button>
          </div>
        </form>

        {/* Sync Results Banner */}
        {lastSyncResult && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <p className="font-semibold text-slate-800">
              Latest Inbox Check: {lastSyncResult.processedCount || 0} emails processed
            </p>
            {lastSyncResult.details && lastSyncResult.details.length > 0 ? (
              <div className="space-y-1 pt-1">
                {lastSyncResult.details.map((d: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="truncate max-w-[260px] font-medium">{d.subject}</span>
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {d.ticketNumber} ({d.action})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">No unread emails needed processing.</p>
            )}
          </div>
        )}

        {/* Inbound Webhook Alternative */}
        <div className="pt-4 border-t border-slate-100 space-y-1.5">
          <p className="text-xs font-bold text-slate-800">Alternative: Inbound Email Webhook URL</p>
          <p className="text-[11px] text-slate-500">
            If you use an external forwarding rule, Zapier, or Google Apps Script to forward incoming mail:
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-slate-100 p-2 rounded-md font-mono text-slate-800 select-all flex-1 overflow-x-auto">
              http://localhost:3000/api/email/inbound
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
