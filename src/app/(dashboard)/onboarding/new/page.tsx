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
import { Loader2, ArrowLeft, ClipboardList } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  employeeId: z.string().min(1, 'Please select an employee'),
  templateName: z.string().min(2, 'Workflow template name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  type: z.enum(['ONBOARDING', 'OFFBOARDING']),
})
type FormData = z.infer<typeof schema>

export default function NewWorkflowPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<{ id: string; name: string | null; email: string }[]>([])

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(d => {
        if (d.users) setEmployees(d.users)
      })
      .catch(console.error)
  }, [])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'ONBOARDING',
      templateName: 'Standard IT Onboarding Checklist',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start workflow')
      toast.success('Workflow initiated with checklist tasks')
      router.push('/onboarding')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error creating workflow')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
          <Link href="/onboarding">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Workflows
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Initiate IT Lifecycle Workflow</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Generate automated IT task checklists for new hires or departing staff
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Workflow Type</Label>
                <Select defaultValue="ONBOARDING" onValueChange={v => setValue('type', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONBOARDING">Employee Onboarding</SelectItem>
                    <SelectItem value="OFFBOARDING">Employee Offboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Select Employee <span className="text-red-500">*</span>
                </Label>
                <Select onValueChange={v => setValue('employeeId', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name || e.email} ({e.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employeeId && <p className="text-xs text-red-600">{errors.employeeId.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="templateName" className="text-xs font-semibold text-slate-700">
                Template / Workflow Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="templateName"
                placeholder="Standard IT Onboarding, Engineering Offboarding..."
                {...register('templateName')}
                className="h-9"
              />
              {errors.templateName && <p className="text-xs text-red-600">{errors.templateName.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-semibold text-slate-700">
                  Start / Target Date <span className="text-red-500">*</span>
                </Label>
                <Input id="startDate" type="date" {...register('startDate')} className="h-9" />
                {errors.startDate && <p className="text-xs text-red-600">{errors.startDate.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-xs font-semibold text-slate-700">Completion Due Date</Label>
                <Input id="dueDate" type="date" {...register('dueDate')} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">Notes & Special Requirements</Label>
              <Textarea id="notes" placeholder="Specific software requirements, manager instructions..." rows={3} {...register('notes')} />
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <Button type="submit" disabled={loading} className="h-9 px-5">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Workflow
              </Button>
              <Button variant="outline" asChild className="h-9">
                <Link href="/onboarding">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
