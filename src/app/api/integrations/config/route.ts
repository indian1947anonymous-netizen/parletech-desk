import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.systemSetting.findMany({
      where: { group: 'integrations' }
    })

    const configMap: Record<string, string> = {}
    for (const s of settings) {
      // Mask secrets when returning to client
      if (s.key.includes('SECRET') || s.key.includes('TOKEN') || s.key.includes('PASSWORD')) {
        configMap[s.key] = s.value ? '••••••••••••••••' : ''
      } else {
        configMap[s.key] = s.value
      }
    }

    return NextResponse.json({ configs: configMap })
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

    const body = await req.json()
    const { platform, credentials } = body

    if (!platform || !credentials) {
      return NextResponse.json({ error: 'Missing platform or credentials' }, { status: 400 })
    }

    // Save each key-value pair in systemSetting with group 'integrations'
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string' && value.trim() && !value.includes('••••')) {
        await prisma.systemSetting.upsert({
          where: { key: `${platform.toUpperCase()}_${key.toUpperCase()}` },
          update: { value: value.trim(), group: 'integrations' },
          create: { key: `${platform.toUpperCase()}_${key.toUpperCase()}`, value: value.trim(), group: 'integrations' }
        })
      }
    }

    // Update integration status
    await prisma.integrationSync.upsert({
      where: { systemName: platform.toUpperCase() },
      update: {
        status: 'CONFIGURED',
        details: `Credentials updated for ${platform}. Ready for live sync.`
      },
      create: {
        systemName: platform.toUpperCase(),
        status: 'CONFIGURED',
        recordCount: 0,
        details: `Credentials configured for ${platform}.`
      }
    })

    return NextResponse.json({
      success: true,
      message: `API configuration for ${platform} saved securely.`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
