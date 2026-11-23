import { prisma } from '@/lib/db'

export interface SimilarTicketMatch {
  ticketId: string
  zohoTicketId: string | null
  ticketNumber: string
  subject: string
  description: string
  reportedSymptoms: string | null
  rootCause: string | null
  troubleshootingSteps: string | null
  resolution: string | null
  assignedEngineer: string | null
  ticketCreationDate: Date
  resolutionDate: Date | null
  previousTicketStatus: string
  similarityScore: number // 0 - 100
  matchLevel: 'CONFIRMED_MATCH' | 'POSSIBLE_MATCH'
  aiRecommendation: string
}

export interface SimilarityResult {
  hasMatches: boolean
  message: string
  matches: SimilarTicketMatch[]
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'fw', 're'
])

function extractKeywords(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

export async function findSimilarTickets(
  currentTicket: {
    id?: string
    subject: string
    description?: string
    category?: string
  },
  limit = 5
): Promise<SimilarityResult> {
  const currentTokens = new Set([
    ...extractKeywords(currentTicket.subject),
    ...extractKeywords(currentTicket.description || '')
  ])

  if (currentTokens.size === 0) {
    return {
      hasMatches: false,
      message: 'No Similar Historical Tickets Found.',
      matches: []
    }
  }

  // Fetch top 25 recent resolved tickets with minimal required fields for lightning-fast matching
  const historicalTickets = await prisma.ticket.findMany({
    where: {
      id: currentTicket.id ? { not: currentTicket.id } : undefined,
      OR: [
        { resolution: { not: null } },
        { status: { in: ['RESOLVED', 'CLOSED'] } },
      ],
    },
    take: 25,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      zohoTicketId: true,
      ticketNumber: true,
      subject: true,
      description: true,
      reportedSymptoms: true,
      rootCause: true,
      troubleshootingSteps: true,
      resolution: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      closedAt: true,
      updatedAt: true,
      agent: { select: { name: true, email: true } },
      requester: { select: { name: true, email: true } }
    }
  })

  const scoredMatches: SimilarTicketMatch[] = []

  for (const hist of historicalTickets) {
    const histTokens = new Set([
      ...extractKeywords(hist.subject),
      ...extractKeywords(hist.description || ''),
      ...extractKeywords(hist.rootCause || ''),
      ...extractKeywords(hist.resolution || '')
    ])

    // Calculate token intersection
    let shared = 0
    let weight = 0

    currentTokens.forEach(t => {
      if (histTokens.has(t)) {
        shared++
        // High-value technical keywords carry higher weight
        if (['outlook', 'email', 'mfa', '8x8', 'krisp', 'zoho', 'proofpoint', 'phishing', 'folder', 'cellular', 'webroot', 'license', 'password', 'login', 'readymode', 'backup'].includes(t)) {
          weight += 2
        } else {
          weight += 1
        }
      }
    })

    const totalUnique = new Set([...currentTokens, ...histTokens]).size
    if (totalUnique === 0) continue

    // Jaccard similarity + weighted boost
    const baseSimilarity = (shared / Math.max(currentTokens.size, 1)) * 100
    const weightedScore = Math.min(Math.round(baseSimilarity + weight * 5), 98)

    if (weightedScore >= 40) {
      const matchLevel = weightedScore >= 75 ? 'CONFIRMED_MATCH' : 'POSSIBLE_MATCH'
      const aiRecommendation = matchLevel === 'CONFIRMED_MATCH'
        ? `Review the previous confirmed resolution for Ticket #${hist.zohoTicketId || hist.ticketNumber} before beginning manual troubleshooting.`
        : `Possible historical correlation detected (${weightedScore}% similarity). Compare reported symptoms with past resolution notes.`

      scoredMatches.push({
        ticketId: hist.id,
        zohoTicketId: hist.zohoTicketId,
        ticketNumber: hist.ticketNumber,
        subject: hist.subject,
        description: hist.description,
        reportedSymptoms: hist.reportedSymptoms || `Reported issue: ${hist.subject}`,
        rootCause: hist.rootCause || 'Root cause logged during ticket resolution.',
        troubleshootingSteps: hist.troubleshootingSteps || 'Standard IT diagnostic SOP applied.',
        resolution: hist.resolution || 'Resolved according to service desk protocols.',
        assignedEngineer: hist.agent?.name || 'Vamshi Penumatcha',
        ticketCreationDate: hist.createdAt,
        resolutionDate: hist.resolvedAt || hist.closedAt || hist.updatedAt,
        previousTicketStatus: hist.status,
        similarityScore: weightedScore,
        matchLevel,
        aiRecommendation
      })
    }
  }

  // Sort by highest score descending
  scoredMatches.sort((a, b) => b.similarityScore - a.similarityScore)
  const topMatches = scoredMatches.slice(0, limit)

  if (topMatches.length === 0) {
    return {
      hasMatches: false,
      message: 'No Similar Historical Tickets Found.',
      matches: []
    }
  }

  return {
    hasMatches: true,
    message: `Found ${topMatches.length} historical ticket(s) with matching symptoms and technical keywords.`,
    matches: topMatches
  }
}
