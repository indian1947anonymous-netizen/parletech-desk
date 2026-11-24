import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')
    const accountsServer = url.searchParams.get('accounts-server') || 'https://accounts.zoho.com'

    if (error) {
      return NextResponse.redirect(new URL(`/settings/integrations?zoho_error=${encodeURIComponent(error)}`, req.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/settings/integrations?zoho_error=Missing+authorization+code', req.url))
    }

    // Retrieve saved client id and secret
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['ZOHO_DESK_CLIENT_ID', 'ZOHO_DESK_CLIENT_SECRET', 'ZOHO_DESK_DOMAIN'] }
      }
    })

    const map: Record<string, string> = {}
    settings.forEach(s => { map[s.key] = s.value })

    const clientId = map['ZOHO_DESK_CLIENT_ID'] || process.env.ZOHO_CLIENT_ID || ''
    const clientSecret = map['ZOHO_DESK_CLIENT_SECRET'] || process.env.ZOHO_CLIENT_SECRET || ''

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/settings/integrations?zoho_error=Missing+Zoho+OAuth+Credentials', req.url))
    }

    const redirectUri = `${url.origin}/api/auth/callback/zoho`

    // Exchange authorization code for tokens
    const tokenUrl = `${accountsServer}/oauth/v2/token`
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      const msg = tokenData.error_description || tokenData.error || 'Failed to exchange token'
      return NextResponse.redirect(new URL(`/settings/integrations?zoho_error=${encodeURIComponent(msg)}`, req.url))
    }

    const refreshToken = tokenData.refresh_token
    const accessToken = tokenData.access_token
    const apiDomain = tokenData.api_domain || 'https://desk.zoho.com'

    // Upsert refresh token and domain in database
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

    // Automatically discover Org ID from Zoho Desk API
    let orgName = ''
    try {
      const orgRes = await fetch(`${apiDomain}/api/v1/organizations`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      if (orgRes.ok) {
        const orgData = await orgRes.json()
        if (orgData.data && orgData.data[0]) {
          const org = orgData.data[0]
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
      console.warn('Auto org discovery warning:', e)
    }

    // Mark Zoho Desk integration as connected
    await prisma.integrationSync.upsert({
      where: { systemName: 'Zoho Desk' },
      create: {
        systemName: 'Zoho Desk',
        status: 'SUCCESS',
        details: orgName ? `Connected to ${orgName}` : 'OAuth Connected'
      },
      update: {
        status: 'SUCCESS',
        details: orgName ? `Connected to ${orgName}` : 'OAuth Connected'
      }
    })

    return NextResponse.redirect(new URL('/settings/integrations?zoho=connected', req.url))
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/settings/integrations?zoho_error=${encodeURIComponent(err.message)}`, req.url))
  }
}
