import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Shield, Sliders, Bell, Mail, Clock, Database } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'System Settings' }

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const [slaPolicies, automationRules, settings] = await Promise.all([
    prisma.slaPolicy.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.automationRule.findMany({ orderBy: { runOrder: 'asc' } }),
    prisma.systemSetting.findMany({ orderBy: { group: 'asc' } }),
  ])

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Governance</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure SLA policies, workflow automation rules, and company defaults
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SLA Policies Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">SLA Target Policies</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Response and resolution target timelines
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {slaPolicies.map((sla) => (
              <div key={sla.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{sla.name}</span>
                  {sla.isDefault && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <span>First Response: <strong>{sla.responseTimeHours}h</strong></span>
                  <span>Target Resolution: <strong>{sla.resolutionTimeHours}h</strong></span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Automation Rules Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Automation & Routing Rules</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Event triggers and ticket escalation actions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {automationRules.map((rule) => (
              <div key={rule.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{rule.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    rule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {rule.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{rule.description}</p>
                <p className="text-[11px] text-slate-400 font-mono">Trigger: {rule.trigger}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* General Application Configuration */}
        <Card className="border-slate-200 shadow-sm md:col-span-2">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Company & Email Configuration</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  System variables, SMTP mailer settings, and ticket number counter
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {settings.map((s) => (
                <div key={s.id} className="p-3 rounded-lg border border-slate-200 bg-white">
                  <p className="font-mono text-xs text-slate-500">{s.key}</p>
                  <p className="text-sm font-bold text-slate-800 mt-1 truncate">
                    {s.value || <span className="text-slate-300 italic">Not configured</span>}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
