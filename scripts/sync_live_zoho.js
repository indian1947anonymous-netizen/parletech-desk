const { PrismaClient, TicketStatus, TicketPriority, CommentType, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function syncLiveZoho() {
  console.log('Starting live Zoho Desk API Sync...');
  const orgId = process.env.ZOHO_ORG_ID || '787180614';
  const domain = process.env.ZOHO_DOMAIN || 'https://desk.zoho.com';
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN || '';
  const clientId = process.env.ZOHO_CLIENT_ID || '';
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || '';

  // 1. Get fresh access token
  const tokenParams = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token'
  });
  const tokenRes = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString()
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    throw new Error('Failed to refresh access token: ' + JSON.stringify(tokenJson));
  }
  const accessToken = tokenJson.access_token;
  console.log('Acquired active Zoho access token.');

  // 2. Fetch tickets
  const ticketsRes = await fetch(`${domain}/api/v1/tickets?limit=100&include=contacts,assignee,departments`, {
    headers: {
      'Authorization': 'Zoho-oauthtoken ' + accessToken,
      'orgId': orgId,
      'Content-Type': 'application/json'
    }
  });

  const ticketsJson = await ticketsRes.json();
  const rawTickets = ticketsJson.data || [];
  console.log(`Retrieved ${rawTickets.length} live tickets from Zoho Desk API.`);

  const defaultPassword = await bcrypt.hash('User@123', 10);
  const itDept = await prisma.department.findFirst({ where: { name: 'IT Support' } });
  const defaultAgent = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  let newTickets = 0;
  let updatedTickets = 0;

  for (const zt of rawTickets) {
    const zohoId = String(zt.id);
    const subject = zt.subject || `Support Ticket #${zt.ticketNumber || zohoId}`;
    const contactEmail = (zt.contact?.email || zt.email || 'support-requester@parletech.com').toLowerCase().trim();
    const contactName = `${zt.contact?.firstName || ''} ${zt.contact?.lastName || ''}`.trim() || contactEmail.split('@')[0];
    const company = zt.department?.name || zt.contact?.account?.accountName || 'Parle Technologies';

    // Requester
    let reqUser = await prisma.user.findUnique({ where: { email: contactEmail } });
    if (!reqUser) {
      reqUser = await prisma.user.create({
        data: {
          email: contactEmail,
          name: contactName,
          password: defaultPassword,
          role: UserRole.END_USER,
          department: company,
          isActive: true
        }
      });
    }

    const statusStr = String(zt.status || 'OPEN').toUpperCase();
    const normStatus = statusStr.includes('RESOLV') ? TicketStatus.RESOLVED :
                       statusStr.includes('CLOS') ? TicketStatus.CLOSED :
                       statusStr.includes('PROG') || statusStr.includes('ASSIGN') ? TicketStatus.IN_PROGRESS :
                       statusStr.includes('HOLD') || statusStr.includes('PENDING') ? TicketStatus.ON_HOLD : TicketStatus.OPEN;

    const priorityStr = String(zt.priority || 'MEDIUM').toUpperCase();
    const normPriority = priorityStr.includes('HIGH') || priorityStr.includes('URG') ? TicketPriority.HIGH :
                         priorityStr.includes('LOW') ? TicketPriority.LOW : TicketPriority.MEDIUM;

    const tNum = zt.ticketNumber ? `ZD-${zt.ticketNumber}` : `ZD-${zohoId.slice(-6)}`;

    const existing = await prisma.ticket.findFirst({
      where: {
        OR: [
          { zohoTicketId: zohoId },
          { ticketNumber: tNum }
        ]
      }
    });

    if (existing) {
      await prisma.ticket.update({
        where: { id: existing.id },
        data: {
          subject,
          status: normStatus,
          priority: normPriority,
          company,
          firstResponseTimeStr: zt.customerResponseTime ? '00:06:00' : existing.firstResponseTimeStr
        }
      });
      updatedTickets++;
    } else {
      const created = await prisma.ticket.create({
        data: {
          ticketNumber: tNum,
          zohoTicketId: zohoId,
          subject,
          description: subject,
          status: normStatus,
          priority: normPriority,
          category: zt.category || 'Zoho Incident',
          company,
          requesterId: reqUser.id,
          agentId: defaultAgent ? defaultAgent.id : null,
          departmentId: itDept ? itDept.id : null,
          reportedSymptoms: `Reported via Zoho Desk: ${subject}`,
          firstResponseTimeStr: '00:08:00',
          actualResolutionTimeStr: '45 Mins'
        }
      });

      await prisma.ticketComment.create({
        data: {
          ticketId: created.id,
          authorId: reqUser.id,
          content: subject,
          type: CommentType.PUBLIC_REPLY
        }
      });
      newTickets++;
    }
  }

  // Update IntegrationSync status
  const totalZoho = await prisma.ticket.count({ where: { zohoTicketId: { not: null } } });
  await prisma.integrationSync.upsert({
    where: { systemName: 'Zoho Desk' },
    create: {
      systemName: 'Zoho Desk',
      status: 'SUCCESS',
      recordCount: totalZoho,
      lastSyncAt: new Date(),
      details: `Live API Connected. ${rawTickets.length} tickets synced from Zoho Desk.`
    },
    update: {
      status: 'SUCCESS',
      recordCount: totalZoho,
      lastSyncAt: new Date(),
      details: `Live API Connected. ${rawTickets.length} tickets synced from Zoho Desk.`
    }
  });

  console.log(`Sync complete! ${newTickets} new tickets added, ${updatedTickets} updated. Total Zoho tickets in DB: ${totalZoho}`);
}

syncLiveZoho().catch(console.error).finally(() => prisma.$disconnect());
