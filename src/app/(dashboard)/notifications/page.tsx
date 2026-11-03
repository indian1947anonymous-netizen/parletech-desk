import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Ticket, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  let notifications: any[] = []

  try {
    notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Mark all as read
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    }).catch(console.error)
  } catch (err) {
    console.error('Error fetching notifications:', err)
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Activity Notifications</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Replies on your tickets, assignments, and status updates
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-start gap-3.5">
                <div className="p-2 rounded-full bg-blue-50 text-blue-600 mt-0.5">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">{n.title}</p>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                  {n.link && (
                    <Link
                      href={n.link}
                      className="inline-flex items-center text-xs font-semibold text-blue-600 hover:underline mt-2"
                    >
                      View details <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="p-12 text-center text-sm text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                You are all caught up! No unread notifications.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
