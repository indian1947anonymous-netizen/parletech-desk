import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'

export interface EmailOptions {
  to: string | string[]
  from?: string
  replyTo?: string
  subject: string
  html: string
  text?: string
  ticketId?: string
  ticketNumber?: string
  agentName?: string
  agentEmail?: string
  direction?: 'INBOUND' | 'OUTBOUND'
}

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD

  if (!host || !user || !password) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass: password },
  })
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const toAddress = Array.isArray(options.to) ? options.to.join(', ') : options.to
  const fromAddress = options.from || process.env.SMTP_FROM || 'ParleTech Desk <support@parletech.com>'
  const replyToAddress = options.replyTo || 'support@parletech.com'

  const plainText = options.text || options.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  let logStatus = 'DELIVERED'
  let logError: string | undefined

  const transporter = createTransporter()

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: toAddress,
        replyTo: replyToAddress,
        subject: options.subject,
        html: options.html,
        text: plainText,
      })
      console.log(`[Email] Outbound email sent via SMTP to: ${toAddress} from: ${fromAddress}`)
    } catch (error: any) {
      console.error('[Email] Failed to send email via SMTP:', error)
      logStatus = 'FAILED'
      logError = error?.message || 'SMTP delivery failed'
    }
  } else {
    console.log(`[Email-Dev] SMTP not configured. Logged outbound email to DB: To=${toAddress}, From=${fromAddress}, Subject=${options.subject}`)
  }

  // Persist into database EmailLog for full audit trail & Zoho Desk outbox
  try {
    await prisma.emailLog.create({
      data: {
        direction: options.direction || 'OUTBOUND',
        from: fromAddress,
        to: toAddress,
        replyTo: replyToAddress,
        subject: options.subject,
        body: plainText,
        htmlBody: options.html,
        ticketId: options.ticketId,
        ticketNumber: options.ticketNumber,
        agentName: options.agentName,
        agentEmail: options.agentEmail,
        status: logStatus,
        error: logError,
      },
    })
  } catch (dbErr) {
    console.error('[Email] Failed to write to emailLog table:', dbErr)
  }

  return logStatus === 'DELIVERED'
}

export function agentReplyEmail(params: {
  ticketNumber: string
  subject: string
  agentName: string
  replyContent: string
  requesterName: string
  appUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `Re: [${params.ticketNumber}] ${params.subject}`
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b;">
      <div style="background: #0f172a; padding: 20px 24px; border-radius: 8px 8px 0 0; display: flex; align-items: center; justify-content: space-between;">
        <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">ParleTech Desk Support</h2>
        <span style="background: #334155; color: #cbd5e1; font-size: 12px; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${params.ticketNumber}</span>
      </div>
      <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 16px; font-size: 15px;">Hello ${params.requesterName},</p>
        <p style="margin: 0 0 20px; font-size: 14px; color: #64748b;"><strong>${params.agentName}</strong> has responded to your ticket:</p>
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 18px; margin: 0 0 24px; border-radius: 0 6px 6px 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap; color: #0f172a;">${params.replyContent}</div>
        <div style="margin: 24px 0 20px;">
          <a href="${params.appUrl}/tickets/${params.ticketNumber}" 
             style="display: inline-block; background: #2563eb; color: #ffffff; font-weight: 500; font-size: 14px; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
            View Ticket & Reply in Portal
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          You can reply directly to this email to update your ticket, or click the button above to view it in the portal.<br />
          Please keep <strong>[${params.ticketNumber}]</strong> in the subject line so your response is threaded accurately.
        </p>
      </div>
    </div>
  `
  return { subject, html, text: params.replyContent }
}

export function ticketCreatedEmail(params: {
  ticketNumber: string
  subject: string
  requesterName: string
  appUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `[${params.ticketNumber}] Your support ticket has been created`
  const text = `Hi ${params.requesterName},\n\nYour support ticket ${params.ticketNumber} ("${params.subject}") has been received and our team is reviewing it.\n\nView ticket: ${params.appUrl}/tickets/${params.ticketNumber}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e293b; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">ParleTech Desk</h1>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
        <p>Hi ${params.requesterName},</p>
        <p>Your support ticket has been received and we'll be in touch soon.</p>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">Ticket Number</p>
          <p style="margin: 4px 0 0; font-size: 20px; font-weight: bold; color: #1e293b;">${params.ticketNumber}</p>
          <p style="margin: 8px 0 0; color: #64748b;">${params.subject}</p>
        </div>
        <a href="${params.appUrl}/tickets/${params.ticketNumber}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 8px 0;">
          View Ticket
        </a>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
          This is an automated message from ParleTech Desk. You can reply directly to this email to add more details.
        </p>
      </div>
    </div>
  `
  return { subject, html, text }
}

export function ticketStatusChangedEmail(params: {
  ticketNumber: string
  subject: string
  newStatus: string
  requesterName: string
  appUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `[${params.ticketNumber}] Ticket status updated: ${params.newStatus}`
  const text = `Hi ${params.requesterName},\n\nThe status of ticket ${params.ticketNumber} has been updated to: ${params.newStatus}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e293b; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">ParleTech Desk</h1>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
        <p>Hi ${params.requesterName},</p>
        <p>The status of your support ticket has been updated.</p>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">${params.ticketNumber}</p>
          <p style="margin: 4px 0; font-weight: bold;">${params.subject}</p>
          <p style="margin: 0;"><strong>New Status:</strong> ${params.newStatus}</p>
        </div>
        <a href="${params.appUrl}/tickets/${params.ticketNumber}" 
           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          View Ticket
        </a>
      </div>
    </div>
  `
  return { subject, html, text }
}

export function newReplyEmail(params: {
  ticketNumber: string
  subject: string
  agentName: string
  replyPreview: string
  requesterName: string
  appUrl: string
}): { subject: string; html: string; text: string } {
  return agentReplyEmail({
    ticketNumber: params.ticketNumber,
    subject: params.subject,
    agentName: params.agentName,
    replyContent: params.replyPreview,
    requesterName: params.requesterName,
    appUrl: params.appUrl,
  })
}
