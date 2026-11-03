'use client'
import { useState } from 'react'
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
import { Loader2, ArrowLeft, Key } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  productName: z.string().min(2, 'Product Name is required'),
  vendor: z.string().optional(),
  licenseType: z.string().min(1, 'License Type is required'),
  totalSeats: z.number().int().min(1, 'At least 1 seat is required'),
  purchaseDate: z.string().optional(),
  expirationDate: z.string().optional(),
  licenseKey: z.string().optional(),
  cost: z.number().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewLicensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      totalSeats: 10,
      licenseType: 'Subscription (Per User)',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add software license')
      toast.success(`License ${json.license.productName} created successfully`)
      router.push('/licenses')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error creating license')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
          <Link href="/licenses">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Licenses
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Add Software License</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Track subscription seats, renewal dates, and license keys
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="productName" className="text-xs font-semibold text-slate-700">
                  Software / Product Name <span className="text-red-500">*</span>
                </Label>
                <Input id="productName" placeholder="e.g. Microsoft 365, Slack, GitHub" {...register('productName')} className="h-9" />
                {errors.productName && <p className="text-xs text-red-600">{errors.productName.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vendor" className="text-xs font-semibold text-slate-700">Vendor / Publisher</Label>
                <Input id="vendor" placeholder="e.g. Microsoft, Adobe, JetBrains" {...register('vendor')} className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">License Model</Label>
                <Select defaultValue="Subscription (Per User)" onValueChange={v => setValue('licenseType', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Subscription (Per User)">Subscription (Per User)</SelectItem>
                    <SelectItem value="Per Device / Machine">Per Device / Machine</SelectItem>
                    <SelectItem value="Perpetual License">Perpetual License</SelectItem>
                    <SelectItem value="Site License">Site / Enterprise License</SelectItem>
                    <SelectItem value="Volume Licensing">Volume Licensing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="totalSeats" className="text-xs font-semibold text-slate-700">
                  Purchased Seats / Allocations <span className="text-red-500">*</span>
                </Label>
                <Input id="totalSeats" type="number" min="1" {...register('totalSeats', { valueAsNumber: true })} className="h-9" />
                {errors.totalSeats && <p className="text-xs text-red-600">{errors.totalSeats.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cost" className="text-xs font-semibold text-slate-700">Cost per Seat ($)</Label>
                <Input id="cost" type="number" step="0.01" placeholder="25.00" {...register('cost', { valueAsNumber: true })} className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expirationDate" className="text-xs font-semibold text-slate-700">Expiration / Renewal Date</Label>
                <Input id="expirationDate" type="date" {...register('expirationDate')} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="licenseKey" className="text-xs font-semibold text-slate-700">License Key / Activation Code</Label>
              <Input id="licenseKey" placeholder="XXXXX-XXXXX-XXXXX" {...register('licenseKey')} className="h-9 font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">Notes / Instructions</Label>
              <Textarea id="notes" placeholder="Enterprise portal link, invoice reference..." rows={3} {...register('notes')} />
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <Button type="submit" disabled={loading} className="h-9 px-5">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save License
              </Button>
              <Button variant="outline" asChild className="h-9">
                <Link href="/licenses">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
