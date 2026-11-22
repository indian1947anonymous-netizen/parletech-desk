import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { zohoDeskService } from '@/lib/integrations/zoho'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await zohoDeskService.getConfig()
    if (!config) {
      return NextResponse.json({
        configured: false,
        message: 'Zoho Desk API credentials not configured.'
      })
    }

    return NextResponse.json({
      configured: true,
      domain: config.domain,
      orgId: config.orgId,
      clientId: config.clientId ? `${config.clientId.slice(0, 6)}••••••••` : ''
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

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'sync'

    if (action === 'test') {
      const configOverride = body.credentials ? {
        clientId: body.credentials.clientId,
        clientSecret: body.credentials.clientSecret,
        refreshToken: body.credentials.refreshToken,
        orgId: body.credentials.orgId || '',
        domain: (body.credentials.domain || 'https://desk.zoho.com').replace(/\/$/, '')
      } : undefined

      const result = await zohoDeskService.testConnection(configOverride)
      return NextResponse.json(result)
    }

    if (action === 'sync') {
      const limit = Number(body.limit) || 100
      const result = await zohoDeskService.syncTicketsToDatabase({ limit })
      return NextResponse.json(result)
    }

    if (action === 'exchange_code') {
      const { code, domain } = body
      if (!code) {
        return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 })
      }

      const raw = await zohoDeskService.getRawCredentials()
      const clientId = raw.clientId || '1000.Q12YH5U5SM8TF135IH7NCVDR4418FC'
      const clientSecret = raw.clientSecret || '7bf2bd0984c894d53d520ea3585d3cb5bf4b6904f5'

      const candidateAccounts = [
        'https://accounts.zoho.com',
        'https://accounts.zoho.in',
        'https://accounts.zoho.eu'
      ]

      let tokenData: any = null
      let successfulAccountDomain = ''

      for (const acc of candidateAccounts) {
        try {
          const params = new URLSearchParams({
            code: code.trim(),
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code'
          })

          const res = await fetch(`${acc}/oauth/v2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
          })

          const json = await res.json()
          if (res.ok && !json.error && (json.refresh_token || json.access_token)) {
            tokenData = json
            successfulAccountDomain = acc
            break
          }
        } catch {
          // try next
        }
      }

      if (!tokenData || (!tokenData.refresh_token && !tokenData.access_token)) {
        return NextResponse.json({
          success: false,
          error: tokenData?.error_description || tokenData?.error || 'Invalid authorization code or code expired. Please generate a fresh code in Self Client.'
        }, { status: 400 })
      }

      const refreshToken = tokenData.refresh_token
      const accessToken = tokenData.access_token
      const apiDomain = (tokenData.api_domain || (successfulAccountDomain.includes('.in') ? 'https://desk.zoho.in' : 'https://desk.zoho.com')).replace(/\/$/, '')

      if (refreshToken) {
        await prisma.systemSetting.upsert({
          where: { key: 'ZOHO_DESK_REFRESH_TOKEN' },
          create: {
            id: 'zoho_refresh_token',
            group: 'integrations',
            key: 'ZOHO_DESK_REFRESH_TOKEN',
            value: refreshToken
          },
          update: { value: refreshToken }
        })
      }

      await prisma.systemSetting.upsert({
        where: { key: 'ZOHO_DESK_DOMAIN' },
        create: {
          id: 'zoho_domain',
          group: 'integrations',
          key: 'ZOHO_DESK_DOMAIN',
          value: apiDomain
        },
        update: { value: apiDomain }
      })

      // Auto-discover orgId
      let orgName = ''
      try {
        const orgRes = await fetch(`${apiDomain}/api/v1/organizations`, {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        if (orgRes.ok) {
          const orgJson = await orgRes.json()
          if (orgJson.data && orgJson.data[0]) {
            const org = orgJson.data[0]
            orgName = org.companyName || org.orgName || ''
            const orgId = String(org.orgId || org.id || '')
            if (orgId) {
              await prisma.systemSetting.upsert({
                where: { key: 'ZOHO_DESK_ORG_ID' },
                create: {
                  id: 'zoho_org_id',
                  group: 'integrations',
                  key: 'ZOHO_DESK_ORG_ID',
                  value: orgId
                },
                update: { value: orgId }
              })
            }
          }
        }
      } catch (e) {
        console.warn('Org discovery error:', e)
      }

      // Immediately sync live tickets into database
      let syncSummary = 'Live API connected!'
      try {
        const syncRes = await zohoDeskService.syncTicketsToDatabase({ limit: 100 })
        syncSummary = syncRes.message
      } catch (sErr: any) {
        syncSummary = `API connected. Initial sync noted: ${sErr.message}`
      }

      return NextResponse.json({
        success: true,
        message: orgName ? `Connected to Zoho Desk (${orgName})! ${syncSummary}` : syncSummary,
        refreshToken: refreshToken ? '••••••••••••••••' : null,
        apiDomain
      })
    }

    if (action === 'send_reply') {
      const { zohoTicketId, content, toAddress } = body
      if (!zohoTicketId || !content) {
        return NextResponse.json({ error: 'zohoTicketId and content required' }, { status: 400 })
      }
      const replyResult = await zohoDeskService.sendReply(zohoTicketId, content, toAddress)
      return NextResponse.json({ success: true, result: replyResult })
    }

    if (action === 'add_comment') {
      const { zohoTicketId, content, isPublic } = body
      if (!zohoTicketId || !content) {
        return NextResponse.json({ error: 'zohoTicketId and content required' }, { status: 400 })
      }
      const commentResult = await zohoDeskService.addComment(zohoTicketId, content, Boolean(isPublic))
      return NextResponse.json({ success: true, result: commentResult })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
