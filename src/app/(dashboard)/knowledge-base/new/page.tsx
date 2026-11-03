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
import { Loader2, ArrowLeft, BookOpen } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  categoryId: z.string().optional(),
  content: z.string().min(10, 'Article content must be at least 10 characters'),
  excerpt: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'INTERNAL']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
})
type FormData = z.infer<typeof schema>

export default function NewArticlePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch('/api/kb/categories')
      .then(r => r.json())
      .then(d => {
        if (d.categories) setCategories(d.categories)
      })
      .catch(console.error)
  }, [])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      visibility: 'PUBLIC',
      status: 'PUBLISHED',
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/kb/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to publish article')
      toast.success('Knowledge Base article published')
      router.push(`/knowledge-base/${json.article.slug}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Error saving article')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
          <Link href="/knowledge-base">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Knowledge Base
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Author Help Article</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Create documentation for users or internal SOPs for agents
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold text-slate-700">
                Article Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. How to Connect to GlobalProtect VPN on macOS"
                {...register('title')}
                className="h-9 font-medium"
              />
              {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Category</Label>
                <Select onValueChange={v => setValue('categoryId', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Visibility</Label>
                <Select defaultValue="PUBLIC" onValueChange={v => setValue('visibility', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public (All Users)</SelectItem>
                    <SelectItem value="INTERNAL">Internal (Staff Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                <Select defaultValue="PUBLISHED" onValueChange={v => setValue('status', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="excerpt" className="text-xs font-semibold text-slate-700">
                Short Summary / Excerpt
              </Label>
              <Input
                id="excerpt"
                placeholder="Brief 1-2 sentence description shown in search results..."
                {...register('excerpt')}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content" className="text-xs font-semibold text-slate-700">
                Full Article Content (Markdown or HTML supported) <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder="Provide step-by-step instructions, screenshots notes, and troubleshooting tips..."
                rows={10}
                {...register('content')}
              />
              {errors.content && <p className="text-xs text-red-600">{errors.content.message}</p>}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <Button type="submit" disabled={loading} className="h-9 px-5">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publish Article
              </Button>
              <Button variant="outline" asChild className="h-9">
                <Link href="/knowledge-base">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
