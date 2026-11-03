import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, Plus, UserCheck, UserX, CheckCircle, Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Employee Onboarding & Offboarding' }

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  let onboardingList: any[] = []
  let offboardingList: any[] = []

  try {
    const [onb, offb] = await Promise.all([
      prisma.onboardingWorkflow.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true, email: true, department: true } },
          tasks: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      prisma.offboardingWorkflow.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true, email: true, department: true } },
          tasks: { orderBy: { sortOrder: 'asc' } },
        },
      }),
    ])
    onboardingList = onb
    offboardingList = offb
  } catch (err) {
    console.error('Error fetching workflows:', err)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Onboarding & Offboarding Workflows</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Structured IT checklists, account provisioning, and asset return workflows
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/onboarding/new">
            <Plus className="h-4 w-4 mr-1.5" /> Start New Workflow
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Onboarding Workflows */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <UserCheck className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Active Onboarding</h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold ml-auto">
              {onboardingList.length}
            </span>
          </div>

          <div className="space-y-3">
            {onboardingList.map((wf) => {
              const completedTasks = wf.tasks.filter((t: any) => t.status === 'COMPLETED').length
              const totalTasks = wf.tasks.length
              const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

              return (
                <Card key={wf.id} className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{wf.employee?.name}</h3>
                        <p className="text-xs text-slate-500">{wf.templateName} • {wf.employee?.department || 'Staff'}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        wf.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {wf.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Tasks Progress</span>
                        <span className="font-bold">{completedTasks} / {totalTasks} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      {wf.tasks.slice(0, 4).map((task: any) => (
                        <div key={task.id} className="flex items-center gap-2 text-xs text-slate-700">
                          {task.status === 'COMPLETED' ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                          )}
                          <span className={task.status === 'COMPLETED' ? 'line-through text-slate-400' : ''}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-400 pt-1">
                      Start Date: {formatDate(wf.startDate)}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
            {onboardingList.length === 0 && (
              <p className="text-xs text-slate-500 italic p-4 text-center border border-dashed rounded-lg">
                No onboarding workflows underway.
              </p>
            )}
          </div>
        </div>

        {/* Offboarding Workflows */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-700">
              <UserX className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Active Offboarding</h2>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold ml-auto">
              {offboardingList.length}
            </span>
          </div>

          <div className="space-y-3">
            {offboardingList.map((wf) => {
              const completedTasks = wf.tasks.filter((t: any) => t.status === 'COMPLETED').length
              const totalTasks = wf.tasks.length
              const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

              return (
                <Card key={wf.id} className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{wf.employee?.name}</h3>
                        <p className="text-xs text-slate-500">{wf.templateName} • {wf.employee?.department || 'Staff'}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                        {wf.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Tasks Progress</span>
                        <span className="font-bold">{completedTasks} / {totalTasks} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      {wf.tasks.slice(0, 4).map((task: any) => (
                        <div key={task.id} className="flex items-center gap-2 text-xs text-slate-700">
                          {task.status === 'COMPLETED' ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                          )}
                          <span className={task.status === 'COMPLETED' ? 'line-through text-slate-400' : ''}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-400 pt-1">
                      Departure Date: {formatDate(wf.startDate)}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
            {offboardingList.length === 0 && (
              <p className="text-xs text-slate-500 italic p-4 text-center border border-dashed rounded-lg">
                No offboarding workflows underway.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
