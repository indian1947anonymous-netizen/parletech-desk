import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { TicketWorkspace } from '@/components/tickets/ticket-workspace'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { ticketNumber: true, subject: true },
    })
    if (!ticket) return { title: 'Ticket Not Found' }
    return { title: `${ticket.ticketNumber} — ${ticket.subject}` }
  } catch {
    return { title: 'Ticket Details' }
  }
}

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  let ticket: any = null
  let agents: any[] = []
  let departments: any[] = []
  let requesterAssets: any[] = []
  let requesterLicenses: any[] = []
  let previousTickets: any[] = []

  try {
    ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true, jobTitle: true, department: true } },
        customer: true,
        agent: { select: { id: true, name: true, email: true } },
        department: true,
        slaPolicy: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, role: true, image: true } },
            attachments: true,
          },
        },
        attachments: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        },
      },
    })

    if (!ticket) {
      notFound()
    }

    // Role check: End users can only view their own tickets
    if (session.user.role === 'END_USER' && ticket.requesterId !== session.user.id) {
      redirect('/tickets')
    }

    // Fetch related IT info for the requester if present
    const requesterId = ticket.requesterId

    const [allAgents, allDepts, userAssets, userLicenses, userTickets] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MANAGER', 'AGENT'] }, isActive: true },
        select: { id: true, name: true, email: true },
      }),
      prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
      requesterId
        ? prisma.assetAssignment.findMany({
            where: { userId: requesterId, returnedAt: null },
            include: { asset: true },
          })
        : Promise.resolve([]),
      requesterId
        ? prisma.licenseAssignment.findMany({
            where: { userId: requesterId, revokedAt: null },
            include: { license: true },
          })
        : Promise.resolve([]),
      requesterId
        ? prisma.ticket.findMany({
            where: { requesterId },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, ticketNumber: true, subject: true, status: true, priority: true },
          })
        : Promise.resolve([]),
    ])

    agents = allAgents
    departments = allDepts
    requesterAssets = userAssets
    requesterLicenses = userLicenses
    previousTickets = userTickets
  } catch (e) {
    console.error('Error fetching ticket details:', e)
    notFound()
  }

  return (
    <TicketWorkspace
      ticket={ticket}
      currentUser={session.user}
      agents={agents}
      departments={departments}
      requesterAssets={requesterAssets}
      requesterLicenses={requesterLicenses}
      previousTickets={previousTickets}
    />
  )
}
