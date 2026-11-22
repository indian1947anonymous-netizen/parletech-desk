import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { TicketStatus, TicketPriority, AssetType, AssetStatus, CommentType, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.role || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const platform = (formData.get('platform') as string)?.toUpperCase()
    const file = formData.get('file') as File | null
    const jsonString = formData.get('jsonData') as string | null

    if (!platform) {
      return NextResponse.json({ error: 'Platform identifier required' }, { status: 400 })
    }

    let records: any[] = []

    if (jsonString) {
      try {
        records = JSON.parse(jsonString)
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
      }
    } else if (file) {
      const text = await file.text()
      if (file.name.endsWith('.json')) {
        records = JSON.parse(text)
      } else if (file.name.endsWith('.csv')) {
        // Simple CSV parser
        const lines = text.split('\n').filter(l => l.trim())
        if (lines.length > 1) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
            const row: Record<string, string> = {}
            headers.forEach((h, idx) => { row[h] = vals[idx] || '' })
            records.push(row)
          }
        }
      }
    }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No valid records found in upload' }, { status: 400 })
    }

    let ingested = 0
    const defaultPassword = await bcrypt.hash('User@123', 10)
    const itDept = await prisma.department.findFirst({ where: { name: 'IT Support' } })
    const defaultAgent = await prisma.user.findFirst({ where: { role: 'ADMIN' } })

    // Ingest according to platform
    if (platform === 'ZOHO_DESK') {
      for (const r of records) {
        const ticketId = String(r.ticketId || r.id || r.TicketId || r.ID || '').trim()
        const subject = r.subject || r.Subject || `Support Incident #${ticketId}`
        const description = r.description || r.Description || subject
        const requesterEmail = (r.email || r.Email || r.requesterEmail || 'user@company.com').toLowerCase().trim()
        const contactName = r.contactName || r.ContactName || r.requesterName || requesterEmail.split('@')[0]
        const priorityStr = (r.priority || r.Priority || 'MEDIUM').toUpperCase()
        const statusStr = (r.status || r.Status || 'OPEN').toUpperCase()
        const resolution = r.resolution || r.Resolution || null
        const rootCause = r.rootCause || r.RootCause || null
        const troubleshootingSteps = r.troubleshootingSteps || r.TroubleshootingSteps || null
        const company = r.company || r.Company || r.department || 'Corporate'

        let reqUser = await prisma.user.findUnique({ where: { email: requesterEmail } })
        if (!reqUser) {
          reqUser = await prisma.user.create({
            data: {
              email: requesterEmail,
              name: contactName,
              password: defaultPassword,
              role: UserRole.END_USER,
              department: company,
              isActive: true
            }
          })
        }

        const normStatus = statusStr.includes('RESOLV') ? TicketStatus.RESOLVED :
                           statusStr.includes('CLOS') ? TicketStatus.CLOSED :
                           statusStr.includes('PROG') ? TicketStatus.IN_PROGRESS : TicketStatus.OPEN

        const normPriority = priorityStr.includes('HIGH') || priorityStr.includes('URG') ? TicketPriority.HIGH :
                             priorityStr.includes('LOW') ? TicketPriority.LOW : TicketPriority.MEDIUM

        const tNum = ticketId ? `ZD-${ticketId}` : `TICK-${Date.now().toString().slice(-6)}`

        const ticket = await prisma.ticket.create({
          data: {
            ticketNumber: tNum,
            zohoTicketId: ticketId || null,
            subject,
            description,
            status: normStatus,
            priority: normPriority,
            category: r.category || 'IT Incident',
            company,
            requester: { connect: { id: reqUser.id } },
            agent: defaultAgent?.id ? { connect: { id: defaultAgent.id } } : undefined,
            department: itDept?.id ? { connect: { id: itDept.id } } : undefined,
            resolution,
            rootCause,
            troubleshootingSteps,
            reportedSymptoms: `User reported: ${subject}`,
            firstResponseTimeStr: r.responseTime || '00:08:00',
            actualResolutionTimeStr: r.resolutionTime || '45 Mins'
          }
        })

        // Add initial ticket comment
        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            authorId: reqUser.id,
            content: description,
            type: CommentType.PUBLIC_REPLY
          }
        })

        ingested++
      }
    } else if (platform === 'KASEYA') {
      for (const r of records) {
        const hostname = String(r.hostname || r.Hostname || r.assetNumber || r.deviceName || '').trim()
        if (!hostname) continue
        const userEmail = (r.assignedUserEmail || r.email || r.Email || '').toLowerCase().trim()
        const userName = r.assignedUserName || r.username || r.Username || ''

        await prisma.kaseyaDevice.upsert({
          where: { hostname },
          update: {
            assignedUserEmail: userEmail || undefined,
            assignedUserName: userName || undefined,
            os: r.os || 'Windows 11 Pro 64-bit',
            isOnline: r.isOnline !== false,
            antivirusStatus: r.antivirusStatus || 'Webroot SecureAnywhere (Active)',
            installedSoftware: r.installedSoftware || ['Microsoft 365 Apps', 'Webroot EDR'],
            remoteSupportUrl: `https://vsa.kaseya.net/liveconnect?device=${hostname}`,
            zohoAssistUrl: `https://assist.zoho.com/app/agent?device=${hostname}`
          },
          create: {
            hostname,
            assignedUserEmail: userEmail || null,
            assignedUserName: userName || null,
            os: r.os || 'Windows 11 Pro 64-bit',
            isOnline: r.isOnline !== false,
            antivirusStatus: r.antivirusStatus || 'Webroot SecureAnywhere (Active)',
            installedSoftware: r.installedSoftware || ['Microsoft 365 Apps', 'Webroot EDR'],
            remoteSupportUrl: `https://vsa.kaseya.net/liveconnect?device=${hostname}`,
            zohoAssistUrl: `https://assist.zoho.com/app/agent?device=${hostname}`
          }
        })
        ingested++
      }
    } else if (platform === 'SNIPE_IT') {
      for (const r of records) {
        const assetTag = String(r.assetTag || r.AssetTag || r.tag || '').trim()
        if (!assetTag) continue

        await prisma.asset.upsert({
          where: { assetTag },
          update: {
            name: r.name || `${r.manufacturer || 'Dell'} Laptop`,
            type: AssetType.LAPTOP,
            manufacturer: r.manufacturer || 'Dell',
            model: r.model || 'Latitude',
            serialNumber: r.serialNumber || r.serial || `SN-${assetTag}`,
            status: AssetStatus.ACTIVE,
            location: r.location || 'HQ / Remote'
          },
          create: {
            assetTag,
            name: r.name || `${r.manufacturer || 'Dell'} Laptop`,
            type: AssetType.LAPTOP,
            manufacturer: r.manufacturer || 'Dell',
            model: r.model || 'Latitude',
            serialNumber: r.serialNumber || r.serial || `SN-${assetTag}`,
            status: AssetStatus.ACTIVE,
            location: r.location || 'HQ / Remote'
          }
        })
        ingested++
      }
    } else if (platform === 'MICROSOFT_365') {
      for (const r of records) {
        const email = String(r.primaryEmail || r.email || r.Email || r.userPrincipalName || '').toLowerCase().trim()
        if (!email) continue

        await prisma.m365Account.upsert({
          where: { primaryEmail: email },
          update: {
            displayName: r.displayName || r.name || email.split('@')[0],
            userPrincipalName: r.userPrincipalName || email,
            accountStatus: r.accountStatus || 'Active',
            assignedLicenses: r.licenses ? (Array.isArray(r.licenses) ? r.licenses : [r.licenses]) : ['Exchange Online (Plan 1)', 'Microsoft 365 Business Standard'],
            mfaStatus: r.mfaStatus || 'Enforced (Microsoft Authenticator)',
            serviceStatus: 'Healthy'
          },
          create: {
            primaryEmail: email,
            displayName: r.displayName || r.name || email.split('@')[0],
            userPrincipalName: r.userPrincipalName || email,
            accountStatus: r.accountStatus || 'Active',
            assignedLicenses: r.licenses ? (Array.isArray(r.licenses) ? r.licenses : [r.licenses]) : ['Exchange Online (Plan 1)', 'Microsoft 365 Business Standard'],
            mfaStatus: r.mfaStatus || 'Enforced (Microsoft Authenticator)',
            serviceStatus: 'Healthy'
          }
        })
        ingested++
      }
    }

    // Update integration sync status
    await prisma.integrationSync.upsert({
      where: { systemName: platform },
      update: {
        recordCount: { increment: ingested },
        status: 'SUCCESS',
        lastSyncAt: new Date(),
        details: `Uploaded and synchronized ${ingested} records from live API data.`
      },
      create: {
        systemName: platform,
        recordCount: ingested,
        status: 'SUCCESS',
        lastSyncAt: new Date(),
        details: `Uploaded and synchronized ${ingested} records from live API data.`
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded and ingested ${ingested} ${platform} records into the system.`,
      ingestedCount: ingested
    })
  } catch (err: any) {
    console.error('Error uploading API data:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
