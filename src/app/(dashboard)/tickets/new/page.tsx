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
import { Loader2, ArrowLeft, Ticket } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  departmentId: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function NewTicketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch('/api/departments')
      .then(r => r.json())
      .then(d => {
        if (d.departments) setDepartments(d.departments)
      })
      .catch(console.error)
  }, [])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'MEDIUM' },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create ticket')
      toast.success(`Ticket ${json.ticket.ticketNumber} created successfully`)
      router.push(`/tickets/${json.ticket.id}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error creating ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
          <Link href="/tickets">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to tickets
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Create New Support Ticket</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Submit an issue, service request, or IT assistance inquiry
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-xs font-semibold text-slate-700">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="e.g. VPN disconnecting frequently, Need software license..."
                {...register('subject')}
                className="h-9"
              />
              {errors.subject && <p className="text-xs text-red-600">{errors.subject.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-slate-700">
                Description & Details <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Please provide complete context: error messages, steps to reproduce, device model..."
                rows={6}
                {...register('description')}
              />
              {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Priority Level</Label>
                <Select defaultValue="MEDIUM" onValueChange={v => setValue('priority', v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low (General inquiry, cosmetic issue)</SelectItem>
                    <SelectItem value="MEDIUM">Medium (Normal business task impacted)</SelectItem>
                    <SelectItem value="HIGH">High (Major function or VIP blocked)</SelectItem>
                    <SelectItem value="URGENT">Urgent (System outage, company-wide)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Department</Label>
                <Select onValueChange={v => setValue('departmentId', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                    {departments.length === 0 && (
                      <SelectItem value="default" disabled>Loading departments...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Category</Label>
                <Select onValueChange={v => setValue('category', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hardware">Hardware (Laptop, Monitor, Peripheral)</SelectItem>
                    <SelectItem value="Software">Software & OS</SelectItem>
                    <SelectItem value="Network">Network, WiFi & VPN</SelectItem>
                    <SelectItem value="Email">Email & Communication</SelectItem>
                    <SelectItem value="Access">Accounts, SSO & Permissions</SelectItem>
                    <SelectItem value="Security">Security & Malware</SelectItem>
                    <SelectItem value="Onboarding">Employee Onboarding</SelectItem>
                    <SelectItem value="Offboarding">Employee Offboarding</SelectItem>
                    <SelectItem value="Other">Other Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Subcategory (Optional)</Label>
                <Input
                  placeholder="e.g. MacOS, DisplayLink, Outlook..."
                  {...register('subcategory')}
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <Button type="submit" disabled={loading} className="h-9 px-5">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Ticket
              </Button>
              <Button variant="outline" asChild className="h-9">
                <Link href="/tickets">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
