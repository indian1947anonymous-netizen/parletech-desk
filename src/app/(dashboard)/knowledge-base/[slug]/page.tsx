import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Eye, ThumbsUp, Calendar, Tag } from 'lucide-react'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const article = await prisma.kbArticle.findUnique({
      where: { slug },
      select: { title: true },
    })
    return { title: article?.title || 'Knowledge Base' }
  } catch {
    return { title: 'Article' }
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const session = await auth()

  let article: any = null

  try {
    article = await prisma.kbArticle.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    })

    if (!article) notFound()

    // Increment views
    await prisma.kbArticle.update({
      where: { id: article.id },
      data: { views: { increment: 1 } },
    }).catch(console.error)
  } catch (err) {
    notFound()
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
          <Link href="/knowledge-base">
            <ArrowLeft className="h-4 w-4 mr-1" /> Knowledge Base
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 space-y-6">
          <div className="border-b border-slate-100 pb-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded">
                {article.category?.name || 'General Help'}
              </span>
              {article.visibility === 'INTERNAL' && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Internal Staff Only
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Updated {formatDate(article.updatedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {article.views + 1} views
              </span>
              <span className="flex items-center gap-1.5">
                <ThumbsUp className="h-3.5 w-3.5" />
                {article.helpful} found this helpful
              </span>
            </div>
          </div>

          {/* Article Body */}
          <div
            className="prose prose-slate max-w-none text-slate-800 leading-relaxed text-sm sm:text-base"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {article.tags && article.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-100 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
