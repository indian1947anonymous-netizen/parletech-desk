import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Users, Ticket, Mail } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Departments' }

export default async function DepartmentsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  let departments: any[] = []

  try {
    departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            tickets: true,
            agents: true,
          },
        },
      },
    })
  } catch (err) {
    console.error('Error fetching departments:', err)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Departments</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Functional support groups, queues, and team routing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <Card key={dept.id} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">{dept.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {dept.description || 'General support department'}
                  </p>
                  {dept.email && (
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-2">
                      <Mail className="h-3 w-3 text-slate-400" /> {dept.email}
                    </p>
                  )}

                  <div className="flex items-center gap-4 pt-3 mt-3 border-t border-slate-100 text-xs">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <strong>{dept._count.agents}</strong> agents
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Ticket className="h-3.5 w-3.5 text-blue-500" />
                      <strong>{dept._count.tickets}</strong> tickets
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
