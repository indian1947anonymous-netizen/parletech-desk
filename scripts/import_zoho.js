const { PrismaClient, TicketStatus, TicketPriority, CommentType, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('/tmp/zoho_tickets.json', 'utf8'));
  console.log('Ingesting', data.length, 'tickets...');

  const defaultPassword = await bcrypt.hash('User@123', 10);
  const itDept = await prisma.department.findFirst({ where: { name: 'IT Support' } });
  const defaultAgent = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  let ingested = 0;
  for (const item of data) {
    const zohoId = item.zohoTicketId;
    const email = item.email.toLowerCase().trim();
    const contactName = email.split('@')[0].replace('.', ' ');
    const company = email.includes('betterlending') ? 'Better Lending' : 'ParleTech';

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: contactName,
          password: defaultPassword,
          role: UserRole.END_USER,
          department: company,
          isActive: true
        }
      });
    }

    const statusStr = (item.status || 'OPEN').toUpperCase();
    const normStatus = statusStr.includes('RESOLV') ? TicketStatus.RESOLVED :
                       statusStr.includes('CLOS') ? TicketStatus.CLOSED :
                       statusStr.includes('PROG') || statusStr.includes('VENDOR') ? TicketStatus.IN_PROGRESS :
                       statusStr.includes('CUSTOMER') || statusStr.includes('HOLD') ? TicketStatus.ON_HOLD : TicketStatus.OPEN;

    const priorityStr = (item.priority || 'MEDIUM').toUpperCase();
    const normPriority = priorityStr.includes('HIGH') || priorityStr.includes('URG') ? TicketPriority.HIGH :
                         priorityStr.includes('LOW') ? TicketPriority.LOW : TicketPriority.MEDIUM;

    const tNum = 'ZD-' + zohoId.slice(-6);

    const existing = await prisma.ticket.findFirst({
      where: {
        OR: [
          { zohoTicketId: zohoId },
          { ticketNumber: tNum }
        ]
      }
    });

    if (!existing) {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: tNum,
          zohoTicketId: zohoId,
          subject: item.subject,
          description: item.description,
          status: normStatus,
          priority: normPriority,
          category: 'Zoho Desk Sync',
          company,
          requesterId: user.id,
          agentId: defaultAgent ? defaultAgent.id : null,
          departmentId: itDept ? itDept.id : null,
          resolution: item.resolution,
          reportedSymptoms: 'User reported: ' + item.subject,
          firstResponseTimeStr: item.responseTime || '00:08:00',
          actualResolutionTimeStr: item.resolutionTime || '45 Mins'
        }
      });

      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: user.id,
          content: item.description,
          type: CommentType.PUBLIC_REPLY
        }
      });
      ingested++;
    }
  }

  // Update IntegrationSync for Zoho Desk
  const totalZoho = await prisma.ticket.count({ where: { zohoTicketId: { not: null } } });
  await prisma.integrationSync.upsert({
    where: { systemName: 'Zoho Desk' },
    create: {
      systemName: 'Zoho Desk',
      status: 'SUCCESS',
      recordCount: totalZoho,
      lastSyncAt: new Date(),
      details: 'Synchronized ' + totalZoho + ' tickets from Zoho Desk'
    },
    update: {
      status: 'SUCCESS',
      recordCount: totalZoho,
      lastSyncAt: new Date(),
      details: 'Synchronized ' + totalZoho + ' tickets from Zoho Desk'
    }
  });

  console.log('Successfully ingested', ingested, 'Zoho Desk tickets! Total Zoho tickets in DB:', totalZoho);
}

main().catch(console.error).finally(() => prisma.$disconnect());
