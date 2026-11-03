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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  company: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create customer')
      toast.success(`Customer ${json.customer.name} added successfully`)
      router.push('/customers')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error creating customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Customers
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Add Customer or Contact</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Register a new employee, client, or point of contact
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input id="name" placeholder="John Doe" {...register('name')} className="h-9" />
                {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input id="email" type="email" placeholder="john@company.com" {...register('email')} className="h-9" />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs font-semibold text-slate-700">Company / Organization</Label>
                <Input id="company" placeholder="Acme Corp" {...register('company')} className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">Phone Number</Label>
                <Input id="phone" placeholder="+1-555-0100" {...register('phone')} className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="jobTitle" className="text-xs font-semibold text-slate-700">Job Title</Label>
                <Input id="jobTitle" placeholder="Marketing Executive" {...register('jobTitle')} className="h-9" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-xs font-semibold text-slate-700">Department</Label>
                <Input id="department" placeholder="Marketing" {...register('department')} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">Internal Notes (Optional)</Label>
              <Textarea id="notes" placeholder="Special VIP requirements, location notes..." rows={3} {...register('notes')} />
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <Button type="submit" disabled={loading} className="h-9 px-5">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Customer
              </Button>
              <Button variant="outline" asChild className="h-9">
                <Link href="/customers">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
