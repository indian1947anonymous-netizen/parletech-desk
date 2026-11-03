import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { roleColor, roleLabel, formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserCheck, Mail, Shield, CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Agents & Staff' }

export default async function AgentsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  let agents: any[] = []

  try {
    agents = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'MANAGER', 'AGENT'] },
      },
      orderBy: { name: 'asc' },
      include: {
        agentProfile: {
          include: { department: true },
        },
        _count: {
          select: {
            assignedTickets: {
              where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] } },
            },
          },
        },
      },
    })
  } catch (err) {
    console.error('Error fetching agents:', err)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Agents & Team</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Support staff, engineers, and administrators
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start gap-3.5">
                <Avatar className="h-10 w-10 border border-slate-200">
                  <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                    {agent.name ? agent.name.slice(0, 2).toUpperCase() : 'AG'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">{agent.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${roleColor(agent.role)}`}>
                      {roleLabel(agent.role)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                    <Mail className="h-3 w-3 text-slate-400" /> {agent.email}
                  </p>
                  <p className="text-xs text-slate-700 font-medium mt-1">
                    {agent.jobTitle || 'Support Specialist'}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Dept: <strong className="text-slate-800">{agent.agentProfile?.department?.name || agent.department || 'General'}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-xs">
                      {agent._count?.assignedTickets || 0} active
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
