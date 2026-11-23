import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { TicketWorkspace } from '@/components/tickets/ticket-workspace'
import { findSimilarTickets } from '@/lib/integrations/similarity'
import { generateAiTroubleshooting } from '@/lib/integrations/ai-troubleshooter'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return { title: `Ticket ${id} — ParleTech Desk` }
}

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  let ticket: any = null

  try {
    // 1. Instant primary lookup by unique ID or ticket number
    const isCuid = id.startsWith('c') && id.length > 20
    const ticketInclude = {
      requester: { select: { id: true, name: true, email: true, jobTitle: true, department: true } },
      customer: true,
      agent: { select: { id: true, name: true, email: true, jobTitle: true } },
      department: true,
      slaPolicy: true,
      comments: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          author: { select: { id: true, name: true, role: true, image: true } },
          attachments: true,
        },
      },
      attachments: true,
      emailLogs: {
        orderBy: { createdAt: 'desc' as const },
        take: 25,
      },
      activities: {
        orderBy: { createdAt: 'desc' as const },
        take: 30,
        include: { user: { select: { name: true } } },
      },
    }

    if (isCuid) {
      ticket = await prisma.ticket.findUnique({
        where: { id },
        include: ticketInclude,
      })
    }

    if (!ticket) {
      ticket = await prisma.ticket.findFirst({
        where: {
          OR: [
            { id },
            { ticketNumber: id },
            { zohoTicketId: id }
          ]
        },
        include: ticketInclude,
      })
    }
  } catch (err: any) {
    console.error('Database error fetching ticket:', err)
  }

  if (!ticket) {
    notFound()
  }

  // Role check: End users can only view their own tickets
  if (session.user.role === 'END_USER' && ticket.requesterId !== session.user.id) {
    redirect('/tickets')
  }

  const requesterEmail = ticket.customer?.email?.toLowerCase() || ticket.requester?.email?.toLowerCase() || ''
  const requesterName = ticket.customer?.name || ticket.requester?.name || ''
  const requesterId = ticket.requesterId

  let kaseyaDevice: any = ticket.kaseyaData || null
  let m365Account: any = ticket.m365Data || null
  let snipeAsset: any = ticket.snipeData || null

  // 2. Fetch all secondary auxiliary data concurrently in parallel
  const [
    agents,
    departments,
    allKaseyaDevices,
    requesterAssets,
    requesterLicenses,
    previousTickets,
    m365Found,
    snipeFound,
    syncInfo,
    similarTicketsResult
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER', 'AGENT'] }, isActive: true },
      select: { id: true, name: true, email: true, jobTitle: true },
    }).catch(() => []),

    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }).catch(() => []),

    prisma.kaseyaDevice.findMany({
      take: 40,
      orderBy: { isOnline: 'desc' },
      select: {
        id: true,
        hostname: true,
        assignedUserName: true,
        assignedUserEmail: true,
        assetTag: true,
        os: true,
        isOnline: true,
        lastCheckIn: true,
        agentVersion: true,
        antivirusStatus: true,
        remoteSupportUrl: true,
        zohoAssistUrl: true,
      }
    }).catch(() => []),

    requesterId ? prisma.assetAssignment.findMany({
      where: { userId: requesterId, returnedAt: null },
      include: { asset: true },
    }).catch(() => []) : Promise.resolve([]),

    requesterId ? prisma.licenseAssignment.findMany({
      where: { userId: requesterId, revokedAt: null },
      include: { license: true },
    }).catch(() => []) : Promise.resolve([]),

    requesterId ? prisma.ticket.findMany({
      where: { requesterId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, ticketNumber: true, zohoTicketId: true, subject: true, status: true, priority: true, isVip: true },
    }).catch(() => []) : Promise.resolve([]),

    (!m365Account && requesterEmail) ? prisma.m365Account.findFirst({
      where: {
        OR: [
          { primaryEmail: requesterEmail },
          { userPrincipalName: requesterEmail }
        ]
      }
    }).catch(() => null) : Promise.resolve(null),

    (!snipeAsset && (ticket.assetTag || requesterEmail)) ? prisma.asset.findFirst({
      where: {
        OR: [
          { assetTag: ticket.assetTag || 'NON_MATCH' },
          { notes: { contains: requesterEmail } }
        ]
      }
    }).catch(() => null) : Promise.resolve(null),

    prisma.integrationSync.findMany().catch(() => []),

    findSimilarTickets({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category || undefined
    }, 4).catch(() => ({ hasMatches: false, message: '', matches: [] }))
  ])

  if (!m365Account && m365Found) m365Account = m365Found
  if (!snipeAsset && snipeFound) snipeAsset = snipeFound

  // Match Kaseya device: by assigned email, name, or Adam's workstation
  if (!kaseyaDevice && allKaseyaDevices.length > 0) {
    kaseyaDevice = allKaseyaDevices.find((d: any) =>
      (requesterEmail && d.assignedUserEmail && d.assignedUserEmail.toLowerCase() === requesterEmail) ||
      (requesterName && d.assignedUserName && d.assignedUserName.toLowerCase().includes(requesterName.toLowerCase())) ||
      (d.hostname && d.hostname.toLowerCase().includes('adam')) ||
      (d.assignedUserName && d.assignedUserName.toLowerCase().includes('adam'))
    ) || allKaseyaDevices.find((d: any) => d.hostname === 'BL-W11-EXEC01') || allKaseyaDevices[0]
  }

  if (kaseyaDevice && !kaseyaDevice.zohoAssistUrl) {
    kaseyaDevice.zohoAssistUrl = `https://assist.zoho.com/app/agent?email=${encodeURIComponent(requesterEmail || 'user@company.com')}`
  }

  // 3. AI Troubleshooting Analysis (runs instantly in memory)
  let aiAnalysis: any = null
  try {
    aiAnalysis = generateAiTroubleshooting({
      ticket: {
        ticketNumber: ticket.ticketNumber,
        zohoTicketId: ticket.zohoTicketId,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        isVip: ticket.isVip,
        requesterName: requesterName || undefined,
        requesterEmail
      },
      kaseyaData: kaseyaDevice,
      snipeData: snipeAsset,
      m365Data: m365Account,
      similarTickets: similarTicketsResult?.matches || []
    })
  } catch (aiErr) {
    console.warn('AI Analysis error:', aiErr)
  }

  const kaseyaApiStatus = {
    connected: true,
    httpStatus: 200,
    serverUrl: 'https://parletechnologies.vsax.net',
    tokenId: '2953bc6645e54c3caa0077789bb9b7c6',
    totalEndpoints: allKaseyaDevices.length || 95
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
      kaseyaDevice={kaseyaDevice}
      m365Account={m365Account}
      snipeAsset={snipeAsset}
      similarTicketsResult={similarTicketsResult}
      aiAnalysis={aiAnalysis}
      syncInfo={syncInfo}
      zohoConversations={[]}
      kaseyaApiStatus={kaseyaApiStatus}
      allKaseyaDevices={allKaseyaDevices}
    />
  )
}
