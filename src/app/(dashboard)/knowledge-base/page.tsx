import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Plus, Search, Eye, ThumbsUp, Folder, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Knowledge Base' }

interface PageProps {
  searchParams: Promise<{ search?: string; categoryId?: string }>
}

export default async function KnowledgeBasePage({ searchParams }: PageProps) {
  const session = await auth()
  const params = await searchParams
  const search = params.search || ''
  const categoryId = params.categoryId

  const where: any = {}
  if (!session?.user || session.user.role === 'END_USER') {
    where.visibility = 'PUBLIC'
    where.status = 'PUBLISHED'
  }
  if (categoryId) where.categoryId = categoryId
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ]
  }

  let categories: any[] = []
  let articles: any[] = []

  try {
    const [cats, arts] = await Promise.all([
      prisma.kbCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { articles: true } } },
      }),
      prisma.kbArticle.findMany({
        where,
        orderBy: { views: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
    ])
    categories = cats
    articles = arts
  } catch (err) {
    console.error('Error fetching KB data:', err)
  }

  const isStaff = session?.user?.role ? ['ADMIN', 'MANAGER', 'AGENT'].includes(session.user.role) : false

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Self-service documentation, troubleshooting guides, and IT FAQs
          </p>
        </div>
        {isStaff && (
          <Button asChild size="sm">
            <Link href="/knowledge-base/new">
              <Plus className="h-4 w-4 mr-1.5" /> Write Article
            </Link>
          </Button>
        )}
      </div>

      {/* Category Folders */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/knowledge-base"
          className={`p-3.5 rounded-xl border text-left transition-all ${
            !categoryId ? 'bg-blue-50/70 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <Folder className="h-5 w-5 text-blue-600 mb-2" />
          <p className="text-sm font-bold text-slate-900">All Topics</p>
          <p className="text-xs text-slate-500">{articles.length} articles</p>
        </Link>

        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/knowledge-base?categoryId=${c.id}`}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              categoryId === c.id ? 'bg-blue-50/70 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <Folder className="h-5 w-5 text-indigo-600 mb-2" />
            <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
            <p className="text-xs text-slate-500">{c._count?.articles || 0} articles</p>
          </Link>
        ))}
      </div>

      {/* Articles List */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Articles ({articles.length})</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((art) => (
            <Link
              key={art.id}
              href={`/knowledge-base/${art.slug}`}
              className="block group"
            >
              <Card className="h-full border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {art.category?.name || 'General'}
                      </span>
                      {art.visibility === 'INTERNAL' && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Staff Only
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {art.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {art.excerpt || 'Click to view full instructions and guide...'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {art.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" /> {art.helpful} helpful
                      </span>
                    </div>
                    <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                      Read <ArrowRight className="h-3 w-3 ml-1" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {articles.length === 0 && (
            <div className="col-span-2 text-center py-12 border border-dashed rounded-xl bg-slate-50/50">
              <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No articles found in this category.</p>
              {isStaff && (
                <Button asChild size="sm" className="mt-3">
                  <Link href="/knowledge-base/new">Write First Article</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
