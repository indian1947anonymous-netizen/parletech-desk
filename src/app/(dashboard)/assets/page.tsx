import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { assetStatusColor, assetTypeLabel, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Monitor, Plus, Laptop, Smartphone, Server, HardDrive, User, CheckCircle2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'IT Asset Management' }

interface PageProps {
  searchParams: Promise<{ search?: string; type?: string; status?: string }>
}

export default async function AssetsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = await searchParams
  const search = params.search || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { assetTag: { contains: search, mode: 'insensitive' } },
      { serialNumber: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (params.type && params.type !== 'all') where.type = params.type as any
  if (params.status && params.status !== 'all') where.status = params.status as any

  let assets: any[] = []
  let total = 0

  try {
    const [aList, aTotal] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          assignments: {
            where: { returnedAt: null },
            include: {
              user: { select: { id: true, name: true, email: true, department: true } },
            },
            take: 1,
          },
        },
      }),
      prisma.asset.count({ where }),
    ])
    assets = aList
    total = aTotal
  } catch (err) {
    console.error('Error fetching assets:', err)
  }

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'LAPTOP': return Laptop
      case 'PHONE': return Smartphone
      case 'SERVER': return Server
      default: return Monitor
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">IT Asset Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Laptops, workstations, mobile devices, and peripherals ({total} total assets)
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/assets/new">
            <Plus className="h-4 w-4 mr-1.5" /> Register Asset
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset / Tag</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Device Type & Model</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Location</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Warranty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((asset) => {
                  const Icon = getAssetIcon(asset.type)
                  const currentAssignment = asset.assignments?.[0]
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{asset.name}</p>
                            <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              {asset.assetTag}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-800 font-medium">{asset.model || assetTypeLabel(asset.type)}</p>
                        <p className="text-xs text-slate-400">S/N: {asset.serialNumber || 'N/A'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${assetStatusColor(asset.status)}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {currentAssignment ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                            <User className="h-3 w-3 text-slate-400" />
                            {currentAssignment.user?.name}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned (In Inventory)</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className="text-xs text-slate-600 font-medium">{asset.location || 'HQ Storage'}</p>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <p className="text-xs text-slate-500">{formatDate(asset.warrantyUntil)}</p>
                      </td>
                    </tr>
                  )
                })}
                {assets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                      No IT assets registered. Click "Register Asset" to add equipment.
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
