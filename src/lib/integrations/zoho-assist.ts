import { prisma } from '@/lib/db'

export interface ZohoAssistSessionResult {
  success: boolean
  sessionId?: string
  customerUrl?: string
  technicianUrl?: string
  error?: string
}

export class ZohoAssistService {
  private async getConfig() {
    const clientId = process.env.ZOHO_ASSIST_CLIENT_ID
    const clientSecret = process.env.ZOHO_ASSIST_CLIENT_SECRET
    const refreshToken = process.env.ZOHO_ASSIST_REFRESH_TOKEN
    const orgId = process.env.ZOHO_ASSIST_ORG_ID || '875436325'
    const deptId = process.env.ZOHO_ASSIST_DEPT_ID || '2801758000000022001'
    const domain = process.env.ZOHO_ASSIST_DOMAIN || 'https://assist.zoho.com'

    if (!clientId || !clientSecret || !refreshToken) {
      return null
    }

    return { clientId, clientSecret, refreshToken, orgId, deptId, domain }
  }

  /**
   * Refreshes OAuth 2.0 Access Token
   */
  async getAccessToken(): Promise<string> {
    const config = await this.getConfig()
    if (!config) throw new Error('Zoho Assist credentials not configured.')

    const params = new URLSearchParams({
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token'
    })

    const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    const json = await res.json()
    if (!json.access_token) {
      throw new Error(`Failed to refresh Zoho Assist token: ${json.error || JSON.stringify(json)}`)
    }

    return json.access_token
  }

  /**
   * Test Connection and retrieve license profile
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const token = await this.getAccessToken()
      const res = await fetch('https://assist.zoho.com/api/v2/user', {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      })

      if (!res.ok) {
        const err = await res.text()
        return { success: false, message: `Zoho Assist API HTTP ${res.status}: ${err}` }
      }

      const data = await res.json()
      const orgName = data?.representation?.org_details?.org_name || 'Better Lending'
      const edition = data?.representation?.license?.remote_support_license?.edition || 'ENTERPRISE'
      const techCount = data?.representation?.license?.remote_support_license?.count || 70

      return {
        success: true,
        message: `Successfully connected to Zoho Assist (${orgName}) - Edition: ${edition} (${techCount} Technicians)`,
        details: data?.representation
      }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  }

  /**
   * Creates an instant remote assistance session for a customer / requester
   */
  async createSession(params: {
    customerEmail?: string | null
    customerName?: string | null
    ticketNumber?: string
    ticketId?: string
    userId?: string
    notes?: string
  }): Promise<ZohoAssistSessionResult> {
    try {
      const config = await this.getConfig()
      if (!config) throw new Error('Zoho Assist credentials not configured.')

      const token = await this.getAccessToken()
      const res = await fetch(`${config.domain}/api/v2/session`, {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_email: params.customerEmail || undefined,
          customer_name: params.customerName || 'Customer',
          department_id: config.deptId,
          notes: params.notes || `IT Service Desk Ticket ${params.ticketNumber || ''}`
        })
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson?.message || `HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      const rep = data?.representation

      if (!rep || !rep.customer_url || !rep.technician_url) {
        throw new Error('Invalid session response from Zoho Assist')
      }

      // Log ticket activity if ticketId provided
      if (params.ticketId) {
        const actingUserId = params.userId || (await prisma.user.findFirst({ select: { id: true } }))?.id
        if (actingUserId) {
          await prisma.ticketActivity.create({
            data: {
              ticketId: params.ticketId,
              userId: actingUserId,
              action: 'UPDATED',
              description: `Zoho Assist Remote Support session created (Session #${rep.session_id}). Customer join link: ${rep.customer_url}`
            }
          }).catch(() => {})
        }
      }

      return {
        success: true,
        sessionId: rep.session_id,
        customerUrl: rep.customer_url,
        technicianUrl: rep.technician_url
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message
      }
    }
  }
}

export const zohoAssistService = new ZohoAssistService()
