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
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { ticketNumber: true, subject: true, zohoTicketId: true },
    })
    if (!ticket) return { title: 'Ticket Not Found' }
    return { title: `${ticket.zohoTicketId ? `#${ticket.zohoTicketId}` : ticket.ticketNumber} — ${ticket.subject}` }
  } catch {
    return { title: 'Ticket Details' }
  }
}

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  let ticket: any = null

  try {
    ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true, jobTitle: true, department: true } },
        customer: true,
        agent: { select: { id: true, name: true, email: true, jobTitle: true } },
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
        emailLogs: {
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        },
      },
    })
  } catch (err: any) {
    console.error('Database error fetching core ticket:', err)
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

  let agents: any[] = []
  let departments: any[] = []
  let requesterAssets: any[] = []
  let requesterLicenses: any[] = []
  let previousTickets: any[] = []
  let kaseyaDevice: any = ticket.kaseyaData || null
  let m365Account: any = ticket.m365Data || null
  let snipeAsset: any = ticket.snipeData || null
  let similarTicketsResult: any = { hasMatches: false, message: '', matches: [] }
  let aiAnalysis: any = null
  let syncInfo: any = null
  let zohoConversations: any[] = []
  let kaseyaApiStatus: any = null
  let allKaseyaDevices: any[] = []

  // Load auxiliary data with independent error handling so connection limits never crash the page
  try {
    agents = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MANAGER', 'AGENT'] }, isActive: true },
      select: { id: true, name: true, email: true, jobTitle: true },
    }).catch(() => [])

    departments = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }).catch(() => [])

    if (requesterId) {
      requesterAssets = await prisma.assetAssignment.findMany({
        where: { userId: requesterId, returnedAt: null },
        include: { asset: true },
      }).catch(() => [])

      requesterLicenses = await prisma.licenseAssignment.findMany({
        where: { userId: requesterId, revokedAt: null },
        include: { license: true },
      }).catch(() => [])

      previousTickets = await prisma.ticket.findMany({
        where: { requesterId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, ticketNumber: true, zohoTicketId: true, subject: true, status: true, priority: true, isVip: true },
      }).catch(() => [])
    }

    if (!kaseyaDevice) {
      kaseyaDevice = await prisma.kaseyaDevice.findFirst({
        where: {
          OR: [
            ...(requesterEmail ? [{ assignedUserEmail: { equals: requesterEmail, mode: 'insensitive' as const } }] : []),
            ...(requesterName ? [{ assignedUserName: { contains: requesterName, mode: 'insensitive' as const } }] : []),
            { hostname: ticket.deviceHostname || 'BL-W11-EXEC01' },
            { assetTag: ticket.assetTag || 'NON_MATCH' }
          ]
        }
      }).catch(() => null)
    }

    if (!m365Account && requesterEmail) {
      m365Account = await prisma.m365Account.findFirst({
        where: {
          OR: [
            { primaryEmail: requesterEmail },
            { userPrincipalName: requesterEmail }
          ]
        }
      }).catch(() => null)
    }

    if (!snipeAsset && (ticket.assetTag || requesterEmail)) {
      snipeAsset = await prisma.asset.findFirst({
        where: {
          OR: [
            { assetTag: ticket.assetTag || 'NON_MATCH' },
            { notes: { contains: requesterEmail } }
          ]
        }
      }).catch(() => null)
    }

    syncInfo = await prisma.integrationSync.findMany().catch(() => [])
  } catch (auxErr) {
    console.warn('Non-fatal auxiliary data error in ticket detail:', auxErr)
  }

  // Similar historical tickets
  try {
    similarTicketsResult = await findSimilarTickets({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category || undefined
    }, 4)
  } catch (simErr) {
    console.warn('Similarity search error:', simErr)
  }

  // AI Troubleshooting
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

  // Live Zoho Desk conversations
  if (ticket.zohoTicketId) {
    try {
      const { zohoDeskService } = await import('@/lib/integrations/zoho')
      zohoConversations = await zohoDeskService.fetchTicketConversations(ticket.zohoTicketId)
    } catch (err) {
      console.warn('Failed to fetch Zoho Desk conversations:', err)
    }
  }

  // Query live Kaseya VSA X REST API v3
  try {
    const { kaseyaService } = await import('@/lib/integrations/kaseya')
    const liveKaseya = await kaseyaService.fetchLiveDeviceForUser({
      userEmail: requesterEmail,
      userName: requesterName,
      company: ticket.company || ticket.customer?.name,
      ticketSubject: ticket.subject,
      ticketDescription: ticket.description,
      assetTag: ticket.assetTag
    })
    kaseyaApiStatus = liveKaseya.apiStatus
    allKaseyaDevices = liveKaseya.allDevices || []

    if (liveKaseya.device) {
      kaseyaDevice = liveKaseya.device
    } else if (!kaseyaDevice && allKaseyaDevices.length > 0) {
      kaseyaDevice = allKaseyaDevices.find((d: any) =>
        (d.Name && d.Name.toLowerCase().includes('adam')) ||
        (d.PrimaryUserName && d.PrimaryUserName.toLowerCase().includes('adam')) ||
        (d.hostname && d.hostname.toLowerCase().includes('adam'))
      ) || allKaseyaDevices[0]
    }

    if (kaseyaDevice && !kaseyaDevice.zohoAssistUrl) {
      kaseyaDevice.zohoAssistUrl = `https://assist.zoho.com/app/agent?email=${encodeURIComponent(requesterEmail || 'user@company.com')}`
    }
  } catch (kErr) {
    console.warn('Kaseya live API fetch error:', kErr)
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
      zohoConversations={zohoConversations}
      kaseyaApiStatus={kaseyaApiStatus}
      allKaseyaDevices={allKaseyaDevices}
    />
  )
}
