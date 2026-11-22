import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { kaseyaService } from '@/lib/integrations/kaseya'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.role || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, credentials } = body

    if (action === 'test') {
      const result = await kaseyaService.testConnection(credentials)
      return NextResponse.json(result)
    }

    if (action === 'sync') {
      const result = await kaseyaService.syncDevicesToDatabase()
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action. Supported: test, sync' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await kaseyaService.getConfig()
    if (!config) {
      return NextResponse.json({ configured: false })
    }

    return NextResponse.json({
      configured: true,
      serverUrl: config.serverUrl,
      tokenName: config.tokenName || 'Vamshi',
      tokenId: config.tokenId,
      tokenSecretMasked: '••••••••••••••••••••••••••••••••'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
