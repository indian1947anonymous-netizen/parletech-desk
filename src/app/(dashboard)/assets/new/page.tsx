'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, ArrowLeft, Monitor } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  assetTag: z.string().min(1, 'Asset Tag is required'),
  name: z.string().min(2, 'Name is required'),
  type: z.enum([
    'LAPTOP',
    'DESKTOP',
    'PHONE',
    'MONITOR',
    'TABLET',
    'PRINTER',
    'SERVER',
    'NETWORK',
    'PERIPHERAL',
    'OTHER',
  ]),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.enum(['ACTIVE', 'IN_REPAIR', 'RETIRED', 'LOST', 'SPARE']),
  location: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  warrantyUntil: z.string().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  assignedUserId: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewAssetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([])

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(d => {
        if (d.users) setUsers(d.users)
      })
      .catch(console.error)
  }, [])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'LAPTOP',
      status: 'ACTIVE',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to register asset')
      toast.success(`Asset ${json.asset.assetTag} registered successfully`)
      router.push('/assets')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error creating asset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
          <Link href="/assets">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Assets
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Register IT Asset</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Add equipment to inventory with tracking tags and assignment
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="assetTag" className="text-xs font-semibold text-slate-700">
                  Asset Tag / Identifier <span className="text-red-500">*</span>
                </Label>
                <Input id="assetTag" placeholder="e.g. LAP-005, DOCK-012" {...register('assetTag')} className="h-9 font-mono uppercase" />
                {errors.assetTag && <p className="text-xs text-red-600">{errors.assetTag.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Device Name <span className="text-red-500">*</span>
                </Label>
                <Input id="name" placeholder='e.g. MacBook Pro 16" M3' {...register('name')} className="h-9" />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Device Type</Label>
                <Select defaultValue="LAPTOP" onValueChange={v => setValue('type', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAPTOP">Laptop</SelectItem>
                    <SelectItem value="DESKTOP">Desktop Workstation</SelectItem>
                    <SelectItem value="PHONE">Mobile Phone</SelectItem>
                    <SelectItem value="MONITOR">Monitor / Display</SelectItem>
                    <SelectItem value="TABLET">Tablet / iPad</SelectItem>
                    <SelectItem value="SERVER">Server</SelectItem>
                    <SelectItem value="NETWORK">Network Device / Router</SelectItem>
                    <SelectItem value="PERIPHERAL">Peripheral / Dock</SelectItem>
                    <SelectItem value="OTHER">Other Hardware</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manufacturer" className="text-xs font-semibold text-slate-700">Manufacturer</Label>
                <Input id="manufacturer" placeholder="Apple, Dell, Lenovo..." {...register('manufacturer')} className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="model" className="text-xs font-semibold text-slate-700">Model</Label>
                <Input id="model" placeholder="ThinkPad X1, XPS 15..." {...register('model')} className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="serialNumber" className="text-xs font-semibold text-slate-700">Serial Number (S/N)</Label>
                <Input id="serialNumber" placeholder="C02XX019..." {...register('serialNumber')} className="h-9 font-mono" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Current Status</Label>
                <Select defaultValue="ACTIVE" onValueChange={v => setValue('status', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active (In Use)</SelectItem>
                    <SelectItem value="SPARE">Spare (In Storage)</SelectItem>
                    <SelectItem value="IN_REPAIR">In Repair / Maintenance</SelectItem>
                    <SelectItem value="RETIRED">Retired / Decommissioned</SelectItem>
                    <SelectItem value="LOST">Lost / Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-xs font-semibold text-slate-700">Location / Office</Label>
                <Input id="location" placeholder="HQ 4th Floor, Remote..." {...register('location')} className="h-9" />
              </div>
            </div>

            {/* Assignment to User */}
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-semibold text-slate-700">Assign To Employee (Optional)</Label>
              <Select onValueChange={v => setValue('assignedUserId', v === 'none' ? undefined : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Keep in stock (Unassigned)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keep in stock (Unassigned)</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="purchaseDate" className="text-xs font-semibold text-slate-700">Purchase Date</Label>
                <Input id="purchaseDate" type="date" {...register('purchaseDate')} className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="warrantyUntil" className="text-xs font-semibold text-slate-700">Warranty Expiration</Label>
                <Input id="warrantyUntil" type="date" {...register('warrantyUntil')} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">Technical Specs & Notes</Label>
              <Textarea id="notes" placeholder="RAM, Storage, OS version, or custom setup..." rows={3} {...register('notes')} />
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <Button type="submit" disabled={loading} className="h-9 px-5">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Asset
              </Button>
              <Button variant="outline" asChild className="h-9">
                <Link href="/assets">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
