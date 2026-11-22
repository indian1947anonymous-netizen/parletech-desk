'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2, RefreshCw, Layers, ShieldCheck, Monitor,
  Laptop, Database, ExternalLink, Clock, ShieldAlert, Cpu,
  Upload, Trash2, Key, Globe, AlertCircle, AlertTriangle, Save, Check
} from 'lucide-react'
import { toast } from 'sonner'

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'zoho' | 'kaseya' | 'snipe' | 'm365'>('zoho')
  const [loading, setLoading] = useState(true)
  const [purging, setPurging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<any>(null)

  // Zoho Form
  const [zohoClientId, setZohoClientId] = useState('')
  const [zohoClientSecret, setZohoClientSecret] = useState('')
  const [zohoRefreshToken, setZohoRefreshToken] = useState('')
  const [zohoOrgId, setZohoOrgId] = useState('')
  const [zohoDomain, setZohoDomain] = useState('https://desk.zoho.com')
  const [zohoTesting, setZohoTesting] = useState(false)
  const [zohoSyncing, setZohoSyncing] = useState(false)
  const [zohoTestStatus, setZohoTestStatus] = useState<{ success: boolean; message: string; orgName?: string } | null>(null)
  const [zohoAuthCode, setZohoAuthCode] = useState('')
  const [exchangingCode, setExchangingCode] = useState(false)

  // Kaseya VSA X Form
  const [kaseyaUrl, setKaseyaUrl] = useState('https://parletech.vsax.net')
  const [kaseyaTokenName, setKaseyaTokenName] = useState('Vamshi')
  const [kaseyaTokenId, setKaseyaTokenId] = useState('2953bc6645e54c3caa0077789bb9b7c6')
  const [kaseyaTokenSecret, setKaseyaTokenSecret] = useState('3d5af23274c0470484d6077731ed96ae0f44c60869a0403eb330805f23fd9c5b')
  const [kaseyaTesting, setKaseyaTesting] = useState(false)
  const [kaseyaTestStatus, setKaseyaTestStatus] = useState<{ success: boolean; message: string; details?: any } | null>(null)
  const [kaseyaSyncing, setKaseyaSyncing] = useState(false)

  // Snipe-IT Form
  const [snipeUrl, setSnipeUrl] = useState('')
  const [snipeToken, setSnipeToken] = useState('')

  // Microsoft 365 Form
  const [m365TenantId, setM365TenantId] = useState('')
  const [m365ClientId, setM365ClientId] = useState('')
  const [m365ClientSecret, setM365ClientSecret] = useState('')

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/integrations/sync')
      const json = await res.json()
      setSyncStatus(json)
    } catch {
      toast.error('Failed to load integration status')
    } finally {
      setLoading(false)
    }
  }

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/integrations/config')
      const json = await res.json()
      if (json.configs) {
        if (json.configs['ZOHO_DESK_CLIENT_ID']) setZohoClientId(json.configs['ZOHO_DESK_CLIENT_ID'])
        if (json.configs['ZOHO_DESK_ORG_ID']) setZohoOrgId(json.configs['ZOHO_DESK_ORG_ID'])
        if (json.configs['ZOHO_DESK_DOMAIN']) setZohoDomain(json.configs['ZOHO_DESK_DOMAIN'])
        if (json.configs['ZOHO_DESK_REFRESH_TOKEN']) setZohoRefreshToken(json.configs['ZOHO_DESK_REFRESH_TOKEN'])

        if (json.configs['KASEYA_SERVER_URL'] || json.configs['KASEYA_URL']) setKaseyaUrl(json.configs['KASEYA_SERVER_URL'] || json.configs['KASEYA_URL'])
        if (json.configs['KASEYA_TOKEN_ID']) setKaseyaTokenId(json.configs['KASEYA_TOKEN_ID'])
        if (json.configs['KASEYA_TOKEN_NAME']) setKaseyaTokenName(json.configs['KASEYA_TOKEN_NAME'])
        if (json.configs['KASEYA_TOKEN_SECRET']) setKaseyaTokenSecret(json.configs['KASEYA_TOKEN_SECRET'])

        if (json.configs['SNIPE_IT_URL']) setSnipeUrl(json.configs['SNIPE_IT_URL'])

        if (json.configs['MICROSOFT_365_TENANT_ID']) setM365TenantId(json.configs['MICROSOFT_365_TENANT_ID'])
        if (json.configs['MICROSOFT_365_CLIENT_ID']) setM365ClientId(json.configs['MICROSOFT_365_CLIENT_ID'])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchConfigs()
  }, [])

  const handlePurgeDummyData = async () => {
    if (!confirm('Are you sure you want to remove all dummy data? This will clear all tickets, telemetry, and dummy records so you can upload fresh API data.')) {
      return
    }

    setPurging(true)
    try {
      const res = await fetch('/api/integrations/purge', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to purge data')
      toast.success('Dummy data wiped clean! The system is now ready for your live API data.')
      fetchStatus()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setPurging(false)
    }
  }

  const handleSaveCredentials = async (platform: string, credentials: Record<string, string>) => {
    setSaving(true)
    try {
      const res = await fetch('/api/integrations/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, credentials })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save configuration')
      toast.success(`${platform} credentials saved successfully!`)
      fetchStatus()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (platform: string) => {
    if (!selectedFile) {
      toast.error('Please choose a JSON or CSV file to upload')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('platform', platform)
      formData.append('file', selectedFile)

      const res = await fetch('/api/integrations/upload', {
        method: 'POST',
        body: formData
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')

      toast.success(json.message)
      setSelectedFile(null)
      fetchStatus()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleTestZohoConnection = async () => {
    setZohoTesting(true)
    setZohoTestStatus(null)
    try {
      const res = await fetch('/api/integrations/zoho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          credentials: {
            clientId: zohoClientId,
            clientSecret: zohoClientSecret,
            refreshToken: zohoRefreshToken,
            orgId: zohoOrgId,
            domain: zohoDomain
          }
        })
      })
      const data = await res.json()
      setZohoTestStatus(data)
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message || 'Connection test failed')
      }
    } catch (e: any) {
      setZohoTestStatus({ success: false, message: e.message })
      toast.error(e.message)
    } finally {
      setZohoTesting(false)
    }
  }

  const handleSyncZohoTickets = async () => {
    setZohoSyncing(true)
    try {
      const res = await fetch('/api/integrations/zoho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', limit: 100 })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        fetchStatus()
      } else {
        toast.error(data.message || 'Zoho sync failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setZohoSyncing(false)
    }
  }

  const handleExchangeCode = async () => {
    if (!zohoAuthCode) {
      toast.error('Please enter or paste the generated Code from Zoho API Console')
      return
    }
    setExchangingCode(true)
    try {
      const res = await fetch('/api/integrations/zoho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exchange_code',
          code: zohoAuthCode,
          domain: zohoDomain
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        setZohoAuthCode('')
        fetchConfigs()
        fetchStatus()
      } else {
        toast.error(data.error || 'Failed to exchange authorization code')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setExchangingCode(false)
    }
  }

  const handleTestKaseyaConnection = async () => {
    setKaseyaTesting(true)
    setKaseyaTestStatus(null)
    try {
      const res = await fetch('/api/integrations/kaseya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          credentials: {
            serverUrl: kaseyaUrl,
            tokenId: kaseyaTokenId,
            tokenSecret: kaseyaTokenSecret,
            tokenName: kaseyaTokenName
          }
        })
      })
      const data = await res.json()
      setKaseyaTestStatus(data)
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setKaseyaTesting(false)
    }
  }

  const handleSyncKaseyaDevices = async () => {
    setKaseyaSyncing(true)
    try {
      const res = await fetch('/api/integrations/kaseya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        fetchStatus()
      } else {
        toast.error(data.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setKaseyaSyncing(false)
    }
  }

  const getZohoAuthUrl = () => {
    const accounts = zohoDomain.includes('.in') ? 'https://accounts.zoho.in' :
                     zohoDomain.includes('.eu') ? 'https://accounts.zoho.eu' : 'https://accounts.zoho.com'
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/zoho` : 'http://localhost:3000/api/auth/callback/zoho'
    return `${accounts}/oauth/v2/auth?scope=Desk.tickets.ALL,Desk.basic.READ,Desk.settings.ALL&client_id=${encodeURIComponent(zohoClientId)}&response_type=code&access_type=offline&prompt=consent&redirect_uri=${encodeURIComponent(redirectUri)}`
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header & Quick Purge Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">API Upload & Integrations Hub</h1>
            <Badge className="bg-blue-600 text-white font-bold text-xs">
              4 Platform Connectors
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Connect live API credentials and upload operational data for Zoho Desk, Kaseya, Snipe-IT, and Microsoft 365
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handlePurgeDummyData}
            disabled={purging}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 font-semibold shadow-xs"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            {purging ? 'Purging...' : 'Remove Dummy Data'}
          </Button>
        </div>
      </div>

      {/* Live System Count Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/30 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-blue-900">Zoho Desk</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {syncStatus?.liveCounts?.zohoDeskTickets || 0}
            </div>
            <span className="text-[10px] text-slate-500">Live Tickets Ingested</span>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/30 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-indigo-900">Kaseya VSA</span>
              <Monitor className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {syncStatus?.liveCounts?.kaseyaEndpoints || 0}
            </div>
            <span className="text-[10px] text-slate-500">Endpoints Monitored</span>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-900">Snipe-IT</span>
              <Laptop className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {syncStatus?.liveCounts?.snipeItAssets || 0}
            </div>
            <span className="text-[10px] text-slate-500">Hardware Assets</span>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/30 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-purple-900">Microsoft 365</span>
              <ShieldCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {syncStatus?.liveCounts?.microsoft365Accounts || 0}
            </div>
            <span className="text-[10px] text-slate-500">Entra ID Accounts</span>
          </CardContent>
        </Card>
      </div>

      {/* API Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab('zoho')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'zoho'
              ? 'bg-white border-t border-x border-slate-200 text-blue-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600" /> Zoho Desk API
        </button>

        <button
          onClick={() => setActiveTab('kaseya')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'kaseya'
              ? 'bg-white border-t border-x border-slate-200 text-indigo-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Monitor className="w-4 h-4 text-indigo-600" /> Kaseya VSA API
        </button>

        <button
          onClick={() => setActiveTab('snipe')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'snipe'
              ? 'bg-white border-t border-x border-slate-200 text-emerald-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4 text-emerald-600" /> Snipe-IT Asset API
        </button>

        <button
          onClick={() => setActiveTab('m365')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === 'm365'
              ? 'bg-white border-t border-x border-slate-200 text-purple-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-purple-600" /> Microsoft 365 Graph API
        </button>
      </div>

      {/* TAB 1: ZOHO DESK API */}
      {activeTab === 'zoho' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">Zoho Desk API Credentials</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Connect via Zoho OAuth 2.0 to sync tickets, comments & resolutions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Client ID</label>
                <Input
                  value={zohoClientId}
                  onChange={e => setZohoClientId(e.target.value)}
                  placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Client Secret</label>
                <Input
                  type="password"
                  value={zohoClientSecret}
                  onChange={e => setZohoClientSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* Option 1: 1-Click Browser OAuth */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-[11px]">Generate Refresh Token</span>
                  <Badge variant="outline" className="text-[10px] bg-white text-blue-700 border-blue-300">Recommended</Badge>
                </div>
                <p className="text-[11px] text-blue-800 leading-tight">
                  Click below to authorize your Zoho Desk account in your browser and automatically retrieve your Refresh Token.
                </p>
                <a
                  href={getZohoAuthUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Authorize with Zoho Desk (1-Click)
                </a>
              </div>

              {/* Option 2: Exchange Self-Client Code */}
              <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="font-semibold text-slate-700 text-[11px]">Or Paste Code from Self Client (Generate Code tab)</label>
                <div className="flex gap-2">
                  <Input
                    value={zohoAuthCode}
                    onChange={e => setZohoAuthCode(e.target.value)}
                    placeholder="Paste Zoho authorization code..."
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={handleExchangeCode}
                    disabled={exchangingCode || !zohoAuthCode}
                    className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-900 text-white font-semibold shrink-0"
                  >
                    {exchangingCode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Exchange'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Refresh Token</label>
                <Input
                  type="password"
                  value={zohoRefreshToken}
                  onChange={e => setZohoRefreshToken(e.target.value)}
                  placeholder="1000.XXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXX"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Organization ID (orgId)</label>
                  <Input
                    value={zohoOrgId}
                    onChange={e => setZohoOrgId(e.target.value)}
                    placeholder="e.g. 7633890000"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Regional Domain</label>
                  <Input
                    value={zohoDomain}
                    onChange={e => setZohoDomain(e.target.value)}
                    placeholder="https://desk.zoho.com"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleSaveCredentials('ZOHO_DESK', {
                    client_id: zohoClientId,
                    client_secret: zohoClientSecret,
                    refresh_token: zohoRefreshToken,
                    org_id: zohoOrgId,
                    domain: zohoDomain
                  })}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Configuration
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestZohoConnection}
                  disabled={zohoTesting || !zohoClientId || !zohoRefreshToken}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 font-bold h-9"
                >
                  {zohoTesting ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  )}
                  {zohoTesting ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>

              {zohoTestStatus && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    zohoTestStatus.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {zohoTestStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">{zohoTestStatus.success ? 'Connected: ' : 'Error: '}</span>
                    {zohoTestStatus.message}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  onClick={handleSyncZohoTickets}
                  disabled={zohoSyncing || !zohoClientId || !zohoRefreshToken}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-9"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${zohoSyncing ? 'animate-spin' : ''}`} />
                  {zohoSyncing ? 'Synchronizing Zoho Desk Tickets...' : 'Pull Live Tickets via Zoho API Now'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900">Upload Zoho Desk Ticket Data</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Directly import JSON or CSV exports from Zoho Desk into the database
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center space-y-2 bg-slate-50/50">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-medium text-slate-700">Select Zoho Desk Export (.json or .csv)</p>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="text-xs mx-auto block"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={() => handleFileUpload('ZOHO_DESK')}
                  disabled={uploading || !selectedFile}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9"
                >
                  {uploading ? 'Ingesting...' : 'Upload & Ingest Zoho Tickets'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-slate-50/50">
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  How to generate Zoho Desk API Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-[11px] text-slate-600 leading-relaxed">
                <p>1. Open <a href="https://api-console.zoho.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Zoho API Console</a> and click <strong>Add Client</strong> (Self Client or Server-based).</p>
                <p>2. Copy the generated <strong>Client ID</strong> and <strong>Client Secret</strong> into the fields on the left.</p>
                <p>3. Generate a Code under the <em>Generate Code</em> tab using scope: <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-900 font-mono">Desk.tickets.ALL,Desk.basic.READ,Desk.settings.ALL</code>.</p>
                <p>4. Exchange the code for a permanent <strong>Refresh Token</strong> and enter it here.</p>
                <p>5. Find your <strong>orgId</strong> in Zoho Desk under <em>Setup &gt; Developer Space &gt; API</em>.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: KASEYA VSA X API */}
      {activeTab === 'kaseya' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Kaseya VSA X API Credentials</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Live endpoint telemetry, device hardware health, and Webroot EDR
                  </CardDescription>
                </div>
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                  VSA X REST API v3
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Kaseya Server URL</label>
                <Input
                  value={kaseyaUrl}
                  onChange={e => setKaseyaUrl(e.target.value)}
                  placeholder="https://parletech.vsax.net"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Token Name</label>
                <Input
                  value={kaseyaTokenName}
                  onChange={e => setKaseyaTokenName(e.target.value)}
                  placeholder="Vamshi"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Token ID</label>
                <Input
                  value={kaseyaTokenId}
                  onChange={e => setKaseyaTokenId(e.target.value)}
                  placeholder="2953bc6645e54c3caa0077789bb9b7c6"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Token Secret</label>
                <Input
                  type="password"
                  value={kaseyaTokenSecret}
                  onChange={e => setKaseyaTokenSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="h-8 text-xs font-mono"
                />
              </div>

              {kaseyaTestStatus && (
                <div className={`p-3 rounded-md text-xs border ${
                  kaseyaTestStatus.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {kaseyaTestStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold">{kaseyaTestStatus.success ? 'API Connection Verified' : 'API Verification Notice'}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">{kaseyaTestStatus.message}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestKaseyaConnection}
                  disabled={kaseyaTesting}
                  className="h-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${kaseyaTesting ? 'animate-spin' : ''}`} />
                  {kaseyaTesting ? 'Testing...' : 'Test Connection'}
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleSaveCredentials('KASEYA', {
                    server_url: kaseyaUrl,
                    token_id: kaseyaTokenId,
                    token_secret: kaseyaTokenSecret,
                    token_name: kaseyaTokenName
                  })}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Configuration
                </Button>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncKaseyaDevices}
                disabled={kaseyaSyncing}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300 font-bold h-9 mt-1"
              >
                <Monitor className={`w-3.5 h-3.5 mr-1.5 text-indigo-600 ${kaseyaSyncing ? 'animate-spin' : ''}`} />
                {kaseyaSyncing ? 'Synchronizing Endpoints...' : 'Pull Live Kaseya Endpoints Now'}
              </Button>
            </CardContent>
          </Card>

          {/* Kaseya Setup Guide & Troubleshooting */}
          <div className="space-y-4">
            <Card className="border-indigo-100 bg-indigo-50/40 shadow-xs">
              <CardHeader className="py-3 px-4 border-b border-indigo-100 bg-indigo-50/80">
                <CardTitle className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Kaseya VSA X Token Integration Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-[11px] text-slate-700 leading-relaxed">
                <div className="p-2.5 bg-white rounded border border-indigo-100 space-y-1">
                  <span className="font-bold text-slate-900 block">Server Instance:</span>
                  <code className="text-[11px] font-mono text-indigo-700">https://parletech.vsax.net</code>
                </div>
                <div className="p-2.5 bg-white rounded border border-indigo-100 space-y-1">
                  <span className="font-bold text-slate-900 block">Authentication Protocol:</span>
                  <p>Uses Basic Auth over HTTPS with <code className="font-mono text-slate-800">Base64(Token_ID:Token_Secret)</code> against REST API v3.</p>
                </div>
                <div className="p-2.5 bg-white rounded border border-indigo-100 space-y-1">
                  <span className="font-bold text-amber-800 block">Token Activation & Start Date:</span>
                  <p className="text-slate-600">
                    If Kaseya returns <em>"Token deactivated, invalid or missing"</em>:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600 mt-1">
                    <li><strong>Start Date:</strong> Ensure Start Date is active for the server's UTC time.</li>
                    <li><strong>Status:</strong> Verify the token is toggled to <strong>Active</strong> under <em>Administration &gt; Configuration &gt; API Access</em>.</li>
                    <li><strong>Scopes:</strong> Ensure Read permissions are granted for <strong>Devices</strong>.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-900">Upload Kaseya Endpoint Backup (Fallback)</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="p-3 border-2 border-dashed border-slate-200 rounded-lg text-center space-y-1 bg-slate-50/50">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-[11px] font-medium text-slate-700">Select Kaseya Devices Export (.json or .csv)</p>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    className="text-[11px] mx-auto block"
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFileUpload('KASEYA')}
                  disabled={uploading || !selectedFile}
                  className="w-full font-bold h-8 text-xs"
                >
                  {uploading ? 'Ingesting...' : 'Ingest Offline Backup'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: SNIPE-IT ASSET API */}
      {activeTab === 'snipe' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">Snipe-IT Asset API Credentials</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Connect hardware inventory, serial numbers & warranty tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Snipe-IT Instance URL</label>
                <Input
                  value={snipeUrl}
                  onChange={e => setSnipeUrl(e.target.value)}
                  placeholder="https://snipeit.yourcompany.com"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Personal Access API Token</label>
                <Input
                  type="password"
                  value={snipeToken}
                  onChange={e => setSnipeToken(e.target.value)}
                  placeholder="Bearer token ••••••••••••••••"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <Button
                size="sm"
                onClick={() => handleSaveCredentials('SNIPE_IT', {
                  url: snipeUrl,
                  token: snipeToken
                })}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 mt-2"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" /> Save Snipe-IT Configuration
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">Upload Snipe-IT Hardware Assets</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Import JSON or CSV inventory with asset tags, serials, and checkouts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center space-y-2 bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-medium text-slate-700">Select Snipe-IT Asset Export (.json or .csv)</p>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-xs mx-auto block"
                />
              </div>

              <Button
                size="sm"
                onClick={() => handleFileUpload('SNIPE_IT')}
                disabled={uploading || !selectedFile}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9"
              >
                {uploading ? 'Ingesting...' : 'Upload & Ingest Assets'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: MICROSOFT 365 GRAPH API */}
      {activeTab === 'm365' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">Microsoft Graph & Entra ID Credentials</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Sync user accounts, assigned licenses, Exchange mailboxes & MFA enforcement
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Azure Directory (Tenant) ID</label>
                <Input
                  value={m365TenantId}
                  onChange={e => setM365TenantId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Application (Client) ID</label>
                <Input
                  value={m365ClientId}
                  onChange={e => setM365ClientId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Client Secret</label>
                <Input
                  type="password"
                  value={m365ClientSecret}
                  onChange={e => setM365ClientSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <Button
                size="sm"
                onClick={() => handleSaveCredentials('MICROSOFT_365', {
                  tenant_id: m365TenantId,
                  client_id: m365ClientId,
                  client_secret: m365ClientSecret
                })}
                disabled={saving}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 mt-2"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" /> Save Microsoft 365 Configuration
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">Upload Microsoft 365 Directory Data</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Import JSON or CSV exports of Entra ID users, licenses & mailbox statuses
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center space-y-2 bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-medium text-slate-700">Select M365 Users Export (.json or .csv)</p>
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-xs mx-auto block"
                />
              </div>

              <Button
                size="sm"
                onClick={() => handleFileUpload('MICROSOFT_365')}
                disabled={uploading || !selectedFile}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-9"
              >
                {uploading ? 'Ingesting...' : 'Upload & Ingest M365 Accounts'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
