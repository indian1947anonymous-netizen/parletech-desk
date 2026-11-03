import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(3),
  categoryId: z.string().optional(),
  content: z.string().min(10),
  excerpt: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'INTERNAL']).default('PUBLIC'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  const { searchParams } = req.nextUrl
  const categoryId = searchParams.get('categoryId')
  const search = searchParams.get('search')

  const where: any = {}
  // Non-logged in or end-users only see PUBLIC articles
  if (!session?.user || session.user.role === 'END_USER') {
    where.visibility = 'PUBLIC'
    where.status = 'PUBLISHED'
  }

  if (categoryId) where.categoryId = categoryId
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ]
  }

  try {
    const articles = await prisma.kbArticle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ articles })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'MANAGER', 'AGENT'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4)

    const article = await prisma.kbArticle.create({
      data: {
        title: data.title,
        slug,
        categoryId: data.categoryId,
        content: data.content,
        excerpt: data.excerpt || data.content.slice(0, 160),
        visibility: data.visibility,
        status: data.status,
        tags: data.tags || [],
        authorId: session.user.id!,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
      },
    })

    return NextResponse.json({ article }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
