import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  employeeId: z.string().min(1),
  templateName: z.string().min(1),
  startDate: z.string(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  type: z.enum(['ONBOARDING', 'OFFBOARDING']).default('ONBOARDING'),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [onboarding, offboarding] = await Promise.all([
      prisma.onboardingWorkflow.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true, email: true, department: true } },
          tasks: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      prisma.offboardingWorkflow.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true, email: true, department: true } },
          tasks: { orderBy: { sortOrder: 'asc' } },
        },
      }),
    ])

    return NextResponse.json({ onboarding, offboarding })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)

    if (data.type === 'ONBOARDING') {
      const workflow = await prisma.onboardingWorkflow.create({
        data: {
          employeeId: data.employeeId,
          templateName: data.templateName,
          startDate: new Date(data.startDate),
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          notes: data.notes,
        },
      })

      // Create default onboarding checklist tasks
      const defaultTasks = [
        'Provision corporate email & AD account',
        'Assign and prepare laptop workstation',
        'Install required software and licenses (M365, VPN)',
        'Configure MFA & security keys',
        'Enroll in MDM & company policies',
        'Schedule IT orientation session',
      ]

      await prisma.onboardingTask.createMany({
        data: defaultTasks.map((title, index) => ({
          workflowId: workflow.id,
          title,
          sortOrder: index + 1,
          status: 'PENDING',
        })),
      })

      return NextResponse.json({ workflow }, { status: 201 })
    } else {
      const workflow = await prisma.offboardingWorkflow.create({
        data: {
          employeeId: data.employeeId,
          templateName: data.templateName,
          startDate: new Date(data.startDate),
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          notes: data.notes,
        },
      })

      const defaultTasks = [
        'Revoke email & cloud application access',
        'Collect company laptop, monitor, and peripherals',
        'Reclaim software licenses and reassign',
        'Wipe / factory reset employee devices',
        'Archive user mailbox and OneDrive data',
        'Disable Active Directory & SSO account',
      ]

      await prisma.offboardingTask.createMany({
        data: defaultTasks.map((title, index) => ({
          workflowId: workflow.id,
          title,
          sortOrder: index + 1,
          status: 'PENDING',
        })),
      })

      return NextResponse.json({ workflow }, { status: 201 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
