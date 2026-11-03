import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Key, Plus, ShieldCheck, AlertCircle, Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'License Management' }

export default async function LicensesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  let licenses: any[] = []

  try {
    licenses = await prisma.softwareLicense.findMany({
      where: { isActive: true },
      orderBy: { productName: 'asc' },
      include: {
        assignments: {
          where: { revokedAt: null },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })
  } catch (err) {
    console.error('Error fetching licenses:', err)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Software License Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            SaaS subscriptions, enterprise keys, and employee seat allocations
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/licenses/new">
            <Plus className="h-4 w-4 mr-1.5" /> Add License
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {licenses.map((lic) => {
          const usedSeats = lic.assignments?.length || 0
          const availableSeats = lic.totalSeats - usedSeats
          const pctUsed = Math.min(100, Math.round((usedSeats / lic.totalSeats) * 100))

          return (
            <Card key={lic.id} className="border-slate-200 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Key className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{lic.productName}</h3>
                      <p className="text-xs text-slate-500">{lic.vendor || 'Vendor'} • {lic.licenseType}</p>
                    </div>
                  </div>
                </div>

                {/* Seats Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Seats Assigned</span>
                    <span className="font-bold text-slate-800">
                      {usedSeats} / {lic.totalSeats} ({pctUsed}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pctUsed > 90 ? 'bg-red-500' : pctUsed > 75 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${pctUsed}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {availableSeats} seats available
                  </p>
                </div>

                {/* Assigned Users list */}
                {lic.assignments && lic.assignments.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <Users className="h-3 w-3 text-slate-400" /> Assigned Employees:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {lic.assignments.slice(0, 4).map((a: any) => (
                        <span key={a.id} className="inline-flex text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {a.user?.name || a.user?.email}
                        </span>
                      ))}
                      {lic.assignments.length > 4 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{lic.assignments.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  <span>Renews: {formatDate(lic.expirationDate)}</span>
                  {lic.cost && <span>${lic.cost}/seat</span>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
