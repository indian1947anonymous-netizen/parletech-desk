import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.role || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Execute atomic deletion of ticket, telemetry, and dummy end-user records
    await prisma.$transaction([
      prisma.ticketComment.deleteMany(),
      prisma.ticketActivity.deleteMany(),
      prisma.ticketAttachment.deleteMany(),
      prisma.relatedTicket.deleteMany(),
      prisma.emailLog.deleteMany(),
      prisma.ticket.deleteMany(),
      prisma.kaseyaDevice.deleteMany(),
      prisma.assetAssignment.deleteMany(),
      prisma.assetRepair.deleteMany(),
      prisma.asset.deleteMany(),
      prisma.licenseAssignment.deleteMany(),
      prisma.m365Account.deleteMany(),
      prisma.onboardingTask.deleteMany(),
      prisma.onboardingWorkflow.deleteMany(),
      prisma.offboardingTask.deleteMany(),
      prisma.offboardingWorkflow.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.user.deleteMany({ where: { role: 'END_USER' } }),
      prisma.integrationSync.updateMany({
        data: {
          recordCount: 0,
          status: 'READY',
          details: 'Purged all dummy data. Ready for live API upload and synchronization.'
        }
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'All dummy tickets, endpoint telemetry, assets, and sample data have been completely removed.'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
