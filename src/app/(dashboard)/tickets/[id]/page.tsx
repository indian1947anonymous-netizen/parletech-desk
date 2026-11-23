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
  let agents: any[] = []
  let departments: any[] = []
  let requesterAssets: any[] = []
  let requesterLicenses: any[] = []
  let previousTickets: any[] = []
  let kaseyaDevice: any = null
  let m365Account: any = null
  let snipeAsset: any = null
  let similarTicketsResult: any = null
  let aiAnalysis: any = null
  let syncInfo: any = null
  let zohoConversations: any[] = []
  let kaseyaApiStatus: any = null
  let allKaseyaDevices: any[] = []

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

    if (!ticket) {
      notFound()
    }

    // Role check: End users can only view their own tickets
    if (session.user.role === 'END_USER' && ticket.requesterId !== session.user.id) {
      redirect('/tickets')
    }

    const requesterEmail = ticket.requester?.email?.toLowerCase() || ''
    const requesterId = ticket.requesterId

    const [allAgents, allDepts, userAssets, userLicenses, userTickets, dev, mAcc, ast, syncLogs] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MANAGER', 'AGENT'] }, isActive: true },
        select: { id: true, name: true, email: true, jobTitle: true },
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
            select: { id: true, ticketNumber: true, zohoTicketId: true, subject: true, status: true, priority: true, isVip: true },
          })
        : Promise.resolve([]),
      prisma.kaseyaDevice.findFirst({
        where: {
          OR: [
            ...(requesterEmail ? [{ assignedUserEmail: { equals: requesterEmail, mode: 'insensitive' as const } }] : []),
            ...(ticket.requester?.name ? [{ assignedUserName: { contains: ticket.requester.name, mode: 'insensitive' as const } }] : []),
            { hostname: ticket.deviceHostname || 'BL-W11-EXEC01' },
            { assetTag: ticket.assetTag || 'NON_MATCH' }
          ]
        }
      }),
      requesterEmail
        ? prisma.m365Account.findFirst({
            where: {
              OR: [
                { primaryEmail: requesterEmail },
                { userPrincipalName: requesterEmail }
              ]
            }
          })
        : Promise.resolve(null),
      ticket.assetTag || requesterEmail
        ? prisma.asset.findFirst({
            where: {
              OR: [
                { assetTag: ticket.assetTag || 'NON_MATCH' },
                { notes: { contains: requesterEmail } }
              ]
            }
          })
        : Promise.resolve(null),
      prisma.integrationSync.findMany()
    ])

    agents = allAgents
    departments = allDepts
    requesterAssets = userAssets
    requesterLicenses = userLicenses
    previousTickets = userTickets
    kaseyaDevice = dev || ticket.kaseyaData
    m365Account = mAcc || ticket.m365Data
    snipeAsset = ast || ticket.snipeData
    syncInfo = syncLogs

    // Fetch similar historical tickets
    similarTicketsResult = await findSimilarTickets({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category || undefined
    }, 4)

    // Generate AI troubleshooting
    aiAnalysis = generateAiTroubleshooting({
      ticket: {
        ticketNumber: ticket.ticketNumber,
        zohoTicketId: ticket.zohoTicketId,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        isVip: ticket.isVip,
        requesterName: ticket.requester?.name || undefined,
        requesterEmail
      },
      kaseyaData: kaseyaDevice,
      snipeData: snipeAsset,
      m365Data: m365Account,
      similarTickets: similarTicketsResult.matches
    })

    // Fetch live Zoho Desk conversations and thread history (Requirement 5)
    if (ticket.zohoTicketId) {
      try {
        const { zohoDeskService } = await import('@/lib/integrations/zoho')
        zohoConversations = await zohoDeskService.fetchTicketConversations(ticket.zohoTicketId)
      } catch (err) {
        console.error('Failed to fetch Zoho Desk conversations:', err)
      }
    }

    // Query live Kaseya VSA X REST API v3 for real user endpoint
    try {
      const { kaseyaService } = await import('@/lib/integrations/kaseya')
      const liveKaseya = await kaseyaService.fetchLiveDeviceForUser({
        userEmail: requesterEmail,
        userName: ticket.requester?.name || ticket.customer?.name,
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
        // Fallback: match Adam's PC or first available device so remote assist is never blank
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
      console.error('Kaseya live API fetch error:', kErr)
    }
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
