import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD

  if (!host || !user || !password) {
    // Return null transporter for dev without email configured
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
  const transporter = createTransporter()

  if (!transporter) {
    console.log('[Email] SMTP not configured. Email would have been sent to:', options.to)
    console.log('[Email] Subject:', options.subject)
    return true // Don't fail in dev
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'ParleTech Desk <support@parletech.com>',
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    return true
  } catch (error) {
    console.error('[Email] Failed to send email:', error)
    return false
  }
}

export function ticketCreatedEmail(params: {
  ticketNumber: string
  subject: string
  requesterName: string
  appUrl: string
}): { subject: string; html: string } {
  return {
    subject: `[${params.ticketNumber}] Your support ticket has been created`,
    html: `
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
            This is an automated message from ParleTech Desk. Please do not reply directly to this email.
          </p>
        </div>
      </div>
    `,
  }
}

export function ticketStatusChangedEmail(params: {
  ticketNumber: string
  subject: string
  newStatus: string
  requesterName: string
  appUrl: string
}): { subject: string; html: string } {
  return {
    subject: `[${params.ticketNumber}] Ticket status updated: ${params.newStatus}`,
    html: `
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
    `,
  }
}

export function newReplyEmail(params: {
  ticketNumber: string
  subject: string
  agentName: string
  replyPreview: string
  requesterName: string
  appUrl: string
}): { subject: string; html: string } {
  return {
    subject: `[${params.ticketNumber}] New reply from ${params.agentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">ParleTech Desk</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0;">
          <p>Hi ${params.requesterName},</p>
          <p>${params.agentName} has replied to your support ticket:</p>
          <div style="background: white; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #374151;">${params.replyPreview}</p>
          </div>
          <a href="${params.appUrl}/tickets/${params.ticketNumber}" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            View & Reply
          </a>
        </div>
      </div>
    `,
  }
}
