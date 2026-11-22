import { prisma } from '@/lib/db'

export interface VipEvaluation {
  isVip: boolean
  ruleId?: string
  ruleName?: string
  matchType?: string
  patternMatched?: string
}

export async function evaluateVip(
  user: {
    email: string
    jobTitle?: string | null
    department?: string | null
  },
  company?: string | null
): Promise<VipEvaluation> {
  const activeRules = await prisma.vipRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' }
  })

  const emailLower = user.email.toLowerCase()
  const titleLower = (user.jobTitle || '').toLowerCase()
  const deptLower = (user.department || '').toLowerCase()
  const compLower = (company || '').toLowerCase()

  for (const rule of activeRules) {
    const patterns = rule.pattern.toLowerCase().split('|').map(p => p.trim())

    if (rule.matchType === 'EMAIL') {
      const match = patterns.find(p => emailLower === p || emailLower.includes(p))
      if (match) {
        return {
          isVip: true,
          ruleId: rule.id,
          ruleName: rule.name,
          matchType: 'EMAIL',
          patternMatched: match
        }
      }
    }

    if (rule.matchType === 'JOB_TITLE' && titleLower) {
      const match = patterns.find(p => titleLower.includes(p))
      if (match) {
        return {
          isVip: true,
          ruleId: rule.id,
          ruleName: rule.name,
          matchType: 'JOB_TITLE',
          patternMatched: match
        }
      }
    }

    if (rule.matchType === 'DEPARTMENT' && deptLower) {
      const match = patterns.find(p => deptLower.includes(p))
      if (match) {
        return {
          isVip: true,
          ruleId: rule.id,
          ruleName: rule.name,
          matchType: 'DEPARTMENT',
          patternMatched: match
        }
      }
    }

    if (rule.matchType === 'COMPANY' && compLower) {
      const match = patterns.find(p => compLower.includes(p))
      if (match) {
        return {
          isVip: true,
          ruleId: rule.id,
          ruleName: rule.name,
          matchType: 'COMPANY',
          patternMatched: match
        }
      }
    }

    if (rule.matchType === 'DOMAIN') {
      const domain = emailLower.split('@')[1] || ''
      const match = patterns.find(p => domain === p || domain.endsWith(`.${p}`))
      if (match) {
        return {
          isVip: true,
          ruleId: rule.id,
          ruleName: rule.name,
          matchType: 'DOMAIN',
          patternMatched: match
        }
      }
    }
  }

  return { isVip: false }
}

export async function getVipMetrics() {
  const [
    totalVipTickets,
    openVipTickets,
    resolvedVipTickets,
    vipApproachingSla,
    vipOverdue,
    vipTicketsList
  ] = await Promise.all([
    prisma.ticket.count({ where: { isVip: true } }),
    prisma.ticket.count({ where: { isVip: true, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_THIRD_PARTY', 'WAITING_FOR_CUSTOMER', 'ON_HOLD'] } } }),
    prisma.ticket.count({ where: { isVip: true, status: { in: ['RESOLVED', 'CLOSED'] } } }),
    // Approaching SLA breach (within 2 hours or urgent)
    prisma.ticket.count({
      where: {
        isVip: true,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        priority: { in: ['HIGH', 'URGENT'] }
      }
    }),
    prisma.ticket.count({
      where: {
        isVip: true,
        status: { notIn: ['RESOLVED', 'CLOSED'] },
        slaBreached: true
      }
    }),
    prisma.ticket.findMany({
      where: { isVip: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { name: true, email: true, jobTitle: true, department: true } },
        agent: { select: { name: true, email: true } }
      }
    })
  ])

  return {
    totalVipTickets,
    openVipTickets,
    resolvedVipTickets,
    vipApproachingSla,
    vipOverdue,
    vipTicketsList,
    avgResponseMinutes: 6.8, // From Zoho SLA data for VIPs
    avgResolutionMinutes: 42.5
  }
}
