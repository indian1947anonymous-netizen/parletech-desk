import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { findSimilarTickets } from '@/lib/integrations/similarity'
import { generateAiTroubleshooting } from '@/lib/integrations/ai-troubleshooter'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        requester: { select: { name: true, email: true, jobTitle: true, department: true } },
        agent: { select: { name: true, email: true } },
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // 1. Find similar tickets
    const similarityResult = await findSimilarTickets({
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category || undefined
    }, 5)

    // 2. Correlate live telemetry from Kaseya, Snipe-IT, M365 if not already saved
    let kaseyaData = ticket.kaseyaData
    let snipeData = ticket.snipeData
    let m365Data = ticket.m365Data

    const userEmail = ticket.requester?.email?.toLowerCase()

    if (!kaseyaData && userEmail) {
      const dev = await prisma.kaseyaDevice.findFirst({
        where: { assignedUserEmail: userEmail }
      })
      if (dev) {
        kaseyaData = {
          hostname: dev.hostname,
          assignedUser: dev.assignedUserName,
          os: dev.os,
          lastCheckIn: dev.lastCheckIn.toISOString(),
          isOnline: dev.isOnline,
          antivirusStatus: dev.antivirusStatus,
          installedSoftware: dev.installedSoftware as any,
          recentAlerts: dev.recentAlerts as any,
          remoteSupportUrl: dev.remoteSupportUrl,
          zohoAssistUrl: dev.zohoAssistUrl
        }
      }
    }

    if (!snipeData && userEmail) {
      const ast = await prisma.asset.findFirst({
        where: {
          OR: [
            { assetTag: ticket.assetTag || '' },
            { notes: { contains: userEmail } }
          ]
        }
      })
      if (ast) {
        snipeData = {
          assetTag: ast.assetTag,
          name: ast.name,
          manufacturer: ast.manufacturer,
          model: ast.model,
          serialNumber: ast.serialNumber,
          status: ast.status,
          location: ast.location,
          warrantyUntil: ast.warrantyUntil ? ast.warrantyUntil.toISOString() : null,
          specs: ast.specs as any
        }
      }
    }

    if (!m365Data && userEmail) {
      const mAcc = await prisma.m365Account.findUnique({
        where: { primaryEmail: userEmail }
      })
      if (mAcc) {
        m365Data = {
          displayName: mAcc.displayName,
          userPrincipalName: mAcc.userPrincipalName,
          primaryEmail: mAcc.primaryEmail,
          accountStatus: mAcc.accountStatus,
          assignedLicenses: mAcc.assignedLicenses,
          exchangeMailbox: mAcc.exchangeMailbox,
          serviceStatus: mAcc.serviceStatus,
          mfaStatus: mAcc.mfaStatus
        }
      }
    }

    // 3. Generate AI Troubleshooting Analysis
    const aiAnalysis = generateAiTroubleshooting({
      ticket: {
        ticketNumber: ticket.ticketNumber,
        zohoTicketId: ticket.zohoTicketId,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        isVip: ticket.isVip,
        requesterName: ticket.requester?.name || undefined,
        requesterEmail: userEmail
      },
      kaseyaData,
      snipeData,
      m365Data,
      similarTickets: similarityResult.matches
    })

    return NextResponse.json({
      similarity: similarityResult,
      aiAnalysis,
      telemetry: {
        kaseya: kaseyaData,
        snipeIt: snipeData,
        microsoft365: m365Data
      }
    })
  } catch (err: any) {
    console.error('Error in AI Assistant API:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
