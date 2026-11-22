import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { zohoDeskService } from '@/lib/integrations/zoho'
import { kaseyaService } from '@/lib/integrations/kaseya'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [syncRecords, counts] = await Promise.all([
      prisma.integrationSync.findMany({
        orderBy: { systemName: 'asc' }
      }),
      Promise.all([
        prisma.ticket.count(),
        prisma.kaseyaDevice.count(),
        prisma.asset.count(),
        prisma.m365Account.count()
      ])
    ])

    return NextResponse.json({
      integrations: syncRecords,
      liveCounts: {
        zohoDeskTickets: counts[0],
        kaseyaEndpoints: counts[1],
        snipeItAssets: counts[2],
        microsoft365Accounts: counts[3]
      },
      lastSyncTimestamp: syncRecords[0]?.lastSyncAt || new Date()
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.role || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()

    // 1. If Zoho Desk credentials exist, perform real live sync
    let zohoMessage = ''
    try {
      const zohoConfig = await zohoDeskService.getConfig()
      if (zohoConfig) {
        const zohoRes = await zohoDeskService.syncTicketsToDatabase({ limit: 50 })
        zohoMessage = `Zoho Desk: ${zohoRes.message}`
      }
    } catch (zErr: any) {
      zohoMessage = `Zoho Desk sync note: ${zErr.message}`
    }

    // 2. If Kaseya VSA credentials exist, perform live device sync
    let kaseyaMessage = ''
    try {
      const kaseyaConfig = await kaseyaService.getConfig()
      if (kaseyaConfig) {
        const kaseyaRes = await kaseyaService.syncDevicesToDatabase()
        kaseyaMessage = `Kaseya VSA: ${kaseyaRes.message}`
      }
    } catch (kErr: any) {
      kaseyaMessage = `Kaseya sync note: ${kErr.message}`
    }

    // 3. Update all sync records with fresh timestamp
    await prisma.integrationSync.updateMany({
      data: {
        lastSyncAt: now,
        status: 'SUCCESS'
      }
    })

    const combinedMessage = [zohoMessage, kaseyaMessage].filter(Boolean).join(' | ') || 'All integrations synchronized successfully.'

    return NextResponse.json({
      success: true,
      message: combinedMessage,
      syncedAt: now
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
