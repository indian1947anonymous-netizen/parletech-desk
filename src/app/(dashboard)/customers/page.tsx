import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Plus, Mail, Phone, Building, Ticket } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Customers & Contacts' }

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = await searchParams
  const search = params.search || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ]
  }

  let customers: any[] = []
  let total = 0

  try {
    const [cList, cTotal] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { tickets: true } },
        },
      }),
      prisma.customer.count({ where }),
    ])
    customers = cList
    total = cTotal
  } catch (err) {
    console.error('Error loading customers:', err)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers & Contacts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} registered contacts and organizational users
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/customers/new">
            <Plus className="h-4 w-4 mr-1.5" /> Add Customer
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Company & Title</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Phone</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tickets</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" /> {c.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-slate-800 font-medium">{c.company || 'Direct Employee'}</p>
                      <p className="text-xs text-slate-400">{c.jobTitle || c.department || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <p className="text-xs text-slate-600">{c.phone || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/tickets?search=${encodeURIComponent(c.email)}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <Ticket className="h-3 w-3 text-blue-600" />
                        {c._count.tickets}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <p className="text-xs text-slate-500">{formatDate(c.createdAt)}</p>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                      No customers registered yet. Click "Add Customer" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
