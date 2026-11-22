import { SimilarTicketMatch } from './similarity'

export interface AiTroubleshootingAnalysis {
  ticketSummary: string
  possibleRootCauses: string[]
  recommendedTroubleshootingSteps: string[]
  suggestedResolution: string
  draftCustomerUpdate: string
  draftClosureNotes: string
  escalationRecommendation: {
    shouldEscalate: boolean
    reason: string
    recommendedTier: string
  }
  confidenceScore: number // 0 - 100
  disclaimer: string
}

export function generateAiTroubleshooting(params: {
  ticket: {
    ticketNumber: string
    zohoTicketId?: string | null
    subject: string
    description: string
    priority: string
    isVip: boolean
    requesterName?: string
    requesterEmail?: string
  }
  kaseyaData?: any
  snipeData?: any
  m365Data?: any
  similarTickets: SimilarTicketMatch[]
}): AiTroubleshootingAnalysis {
  const { ticket, kaseyaData, snipeData, m365Data, similarTickets } = params
  const subLower = ticket.subject.toLowerCase()
  const descLower = ticket.description.toLowerCase()
  const fullText = `${subLower} ${descLower}`

  // Check top historical match
  const bestMatch = similarTickets.length > 0 ? similarTickets[0] : null

  const rootCauses: string[] = []
  const steps: string[] = []
  let suggestedResolution = ''

  if (bestMatch && bestMatch.rootCause && bestMatch.similarityScore >= 60) {
    rootCauses.push(`Historical Precedent (Ticket #${bestMatch.zohoTicketId || bestMatch.ticketNumber}): ${bestMatch.rootCause}`)
  }

  // Domain-specific technical analysis
  if (fullText.includes('outlook') || fullText.includes('mailbox') || fullText.includes('email') || fullText.includes('folder')) {
    rootCauses.push('Cached Exchange Mode OST corruption or Gmail IMAP folder sync desynchronization.')
    rootCauses.push('Folder inadvertently moved to "Deleted Items", "Archive", or filtered by inbox rule.')
    steps.push('1. Check webmail (Outlook Web App or Gmail) to verify if the folder and messages exist server-side.')
    steps.push('2. If server-side is intact, initiate Outlook "Send/Receive All Folders" or recreate Outlook profile.')
    steps.push('3. Inspect mailbox rules in Microsoft 365 Exchange Online for auto-archive or forwarding actions.')
    suggestedResolution = bestMatch?.resolution || 'Restored folder structure in mailbox and verified synchronized status with webmail.'
  } else if (fullText.includes('phishing') || fullText.includes('proofpoint') || fullText.includes('suspicious') || fullText.includes('blocked')) {
    rootCauses.push('Email triggered Proofpoint Essentials inbound threat gateway heuristics (SPF/DKIM mismatch or suspicious links).')
    rootCauses.push('Automated ticketing notification sent to agent matched phishing indicators and triggered policy block.')
    steps.push('1. Review Proofpoint Essentials message logs and headers for delivery quarantine code.')
    steps.push('2. Confirm sender domain authenticity and analyze embedded URLs using security sandbox.')
    steps.push('3. If legitimate internal correspondence, whitelist specific sender header; otherwise maintain quarantine.')
    suggestedResolution = bestMatch?.resolution || 'Investigation confirmed suspicious links. Proofpoint quarantine verified functioning as intended; no risk to endpoint.'
  } else if (fullText.includes('8x8') || fullText.includes('phone') || fullText.includes('call') || fullText.includes('audio')) {
    rootCauses.push('8x8 Work softphone SSO authentication token expiration or invalid headset audio channel assignment.')
    rootCauses.push('Windows privacy microphone permissions blocking 8x8 client access.')
    steps.push('1. Connect to user endpoint using Zoho Assist or Kaseya VSA Remote Control.')
    steps.push('2. Clear 8x8 cached tokens in %AppData%\\8x8 Work and complete SAML/SSO login.')
    steps.push('3. Check Windows Sound Settings > Input/Output Device defaults and test outbound audio.')
    suggestedResolution = bestMatch?.resolution || 'Connected to user workstation remotely, cleared 8x8 session cache, and re-authenticated softphone.'
  } else if (fullText.includes('krisp') || fullText.includes('readymode')) {
    rootCauses.push('Krisp AI noise suppression driver unmapped from Readymode calling interface.')
    steps.push('1. Verify Krisp application is running in Windows system tray.')
    steps.push('2. Set Readymode microphone device to "Krisp Microphone" and speaker to "Krisp Speaker".')
    steps.push('3. Test audio loopback in Readymode diagnostic utility.')
    suggestedResolution = bestMatch?.resolution || 'Configured Krisp virtual audio device inside Readymode settings and verified clear microphone input.'
  } else if (fullText.includes('mfa') || fullText.includes('authenticator') || fullText.includes('auth')) {
    rootCauses.push('Microsoft Entra ID conditional access policy requiring re-registration of Microsoft Authenticator.')
    rootCauses.push('Expired session token on endpoint or device registration token desync.')
    steps.push('1. Open Microsoft Entra ID admin center and check sign-in logs for user.')
    steps.push('2. Initiate "Require re-register MFA" or issue temporary access pass if user is locked out.')
    steps.push('3. Walk requester through Microsoft Authenticator push notification verification.')
    suggestedResolution = bestMatch?.resolution || 'Cleared authentication cache, refreshed Entra ID token, and verified MFA push notification on mobile device.'
  } else if (fullText.includes('cellular') || fullText.includes('backup') || fullText.includes('network')) {
    rootCauses.push('Failover cellular gateway SIM profile not registered on primary failover routing table.')
    steps.push('1. Access remote gateway console and verify SIM signal strength and APN status.')
    steps.push('2. Run automated failover test by simulating WAN disconnection.')
    steps.push('3. Confirm DNS resolution and ping latency over backup LTE/5G line.')
    suggestedResolution = bestMatch?.resolution || 'Configured backup SIM credentials and verified automated failover routing.'
  } else {
    rootCauses.push('Standard application configuration mismatch or endpoint operating system cache anomaly.')
    steps.push('1. Review user reported symptoms and correlate with endpoint logs.')
    steps.push('2. Perform diagnostic reboot or service restart.')
    steps.push('3. Validate application functionality with requester.')
    suggestedResolution = bestMatch?.resolution || 'Diagnosed application settings, applied corrective configuration, and confirmed normal operation.'
  }

  // Telemetry insights
  if (kaseyaData) {
    if (!kaseyaData.isOnline) {
      steps.unshift('⚠️ NOTE: Kaseya reports device is currently OFFLINE. Reach out to user via phone or alternate contact.')
    }
    if (kaseyaData.antivirusStatus && !kaseyaData.antivirusStatus.includes('Active')) {
      rootCauses.push('Kaseya Alert: Webroot EDR reports definitions out of date or agent inactive.')
      steps.push('Run Kaseya Agent procedure: "Force Webroot Threat Definition Update".')
    }
  }

  if (m365Data && m365Data.accountStatus !== 'Active') {
    rootCauses.push(`Microsoft 365 Warning: User account status is currently "${m365Data.accountStatus}".`)
    steps.unshift(`Check Entra ID: User account is ${m365Data.accountStatus}. Re-enable account if blocked.`)
  }

  // Draft customer update
  const requesterGreeting = ticket.requesterName ? `Hello ${ticket.requesterName},` : 'Hello,'
  const draftCustomerUpdate = `${requesterGreeting}\n\n` +
    `Thank you for contacting the ParleTech IT Support Desk regarding your ticket "${ticket.subject}".\n\n` +
    `Our engineering team has analyzed your request and identified the recommended diagnostic steps:\n` +
    `${steps.slice(0, 2).map((s, i) => `${i + 1}. ${s.replace(/^\d+\.\s*/, '')}`).join('\n')}\n\n` +
    `We are actively working on your ticket. Please let us know if you are currently at your workstation so we can coordinate any remote assistance needed.\n\n` +
    `Best regards,\nParleTech IT Support Desk`

  // Draft closure notes
  const draftClosureNotes = `[RESOLUTION & CLOSURE NOTES]\n` +
    `Ticket ID: ${ticket.zohoTicketId || ticket.ticketNumber}\n` +
    `Subject: ${ticket.subject}\n` +
    `Identified Root Cause: ${rootCauses[0] || 'Standard service request'}\n` +
    `Troubleshooting Applied:\n${steps.map(s => `  • ${s}`).join('\n')}\n` +
    `Final Resolution: ${suggestedResolution}\n` +
    `Verified with User: YES\n` +
    `Engineer Sign-off: CONFIRMED`

  // Escalation recommendations
  const isHighSeverity = ticket.priority === 'HIGH' || ticket.priority === 'URGENT'
  const shouldEscalate = (ticket.isVip && isHighSeverity) || fullText.includes('cellular') || fullText.includes('ransomware')
  const escalationReason = ticket.isVip
    ? 'VIP Requester ticket with High Priority approaching SLA window. Recommend Tier-2 / Lead Engineer engagement.'
    : shouldEscalate
      ? 'Complex infrastructure or security dependency requiring Tier-2 systems engineering escalation.'
      : 'Standard Tier-1 troubleshooting path is sufficient; no immediate escalation required.'

  const confidenceScore = bestMatch ? Math.min(bestMatch.similarityScore, 95) : 75

  return {
    ticketSummary: `Ticket #${ticket.zohoTicketId || ticket.ticketNumber}: "${ticket.subject}" for ${ticket.requesterName || 'requester'} (${ticket.isVip ? 'VIP HIGH PRIORITY' : 'Standard Priority'}).`,
    possibleRootCauses: rootCauses,
    recommendedTroubleshootingSteps: steps,
    suggestedResolution,
    draftCustomerUpdate,
    draftClosureNotes,
    escalationRecommendation: {
      shouldEscalate,
      reason: escalationReason,
      recommendedTier: shouldEscalate ? 'Tier-2 Infrastructure / Lead Engineer' : 'Tier-1 Service Desk Technician'
    },
    confidenceScore,
    disclaimer: 'AI-generated troubleshooting recommendations are based on historical incident patterns and live telemetry. An IT engineer must verify and confirm all resolutions before closing tickets.'
  }
}
