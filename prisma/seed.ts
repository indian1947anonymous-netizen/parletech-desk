import { PrismaClient, UserRole, TicketStatus, TicketPriority, AssetType, AssetStatus, ArticleStatus, ArticleVisibility } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding ParleTech Desk database...')

  // ─── Clean up ───────────────────────────────────────────────
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.offboardingTask.deleteMany()
  await prisma.offboardingWorkflow.deleteMany()
  await prisma.onboardingTask.deleteMany()
  await prisma.onboardingWorkflow.deleteMany()
  await prisma.licenseAssignment.deleteMany()
  await prisma.softwareLicense.deleteMany()
  await prisma.assetRepair.deleteMany()
  await prisma.assetAssignment.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.kbArticle.deleteMany()
  await prisma.kbCategory.deleteMany()
  await prisma.automationExecution.deleteMany()
  await prisma.automationRule.deleteMany()
  await prisma.slaPolicy.deleteMany()
  await prisma.savedView.deleteMany()
  await prisma.ticketActivity.deleteMany()
  await prisma.ticketAttachment.deleteMany()
  await prisma.ticketComment.deleteMany()
  await prisma.relatedTicket.deleteMany()
  await prisma.ticket.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.agent.deleteMany()
  await prisma.department.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
  await prisma.systemSetting.deleteMany()

  // ─── Departments ────────────────────────────────────────────
  const itDept = await prisma.department.create({
    data: { name: 'IT Support', description: 'Information Technology Support Team', email: 'it@parletech.com' },
  })
  const hrDept = await prisma.department.create({
    data: { name: 'HR', description: 'Human Resources Department', email: 'hr@parletech.com' },
  })
  const generalDept = await prisma.department.create({
    data: { name: 'General', description: 'General Support', email: 'support@parletech.com' },
  })

  // ─── Users ──────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Admin@123', 12)

  const adminUser = await prisma.user.create({
    data: {
      name: 'Vamshi (Admin)',
      email: 'Indian1947anonymous@gmail.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      jobTitle: 'Super Administrator',
      department: 'IT Support',
    },
  })

  const adminUser2 = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@parletech.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      jobTitle: 'System Administrator',
      department: 'IT Support',
    },
  })

  const managerUser = await prisma.user.create({
    data: {
      name: 'Sarah Manager',
      email: 'manager@parletech.com',
      password: hashedPassword,
      role: UserRole.MANAGER,
      jobTitle: 'IT Manager',
      department: 'IT Support',
    },
  })

  const agent1 = await prisma.user.create({
    data: {
      name: 'John Agent',
      email: 'john@parletech.com',
      password: hashedPassword,
      role: UserRole.AGENT,
      jobTitle: 'Support Engineer',
      department: 'IT Support',
    },
  })

  const agent2 = await prisma.user.create({
    data: {
      name: 'Emily Davis',
      email: 'emily@parletech.com',
      password: hashedPassword,
      role: UserRole.AGENT,
      jobTitle: 'IT Support Specialist',
      department: 'IT Support',
    },
  })

  const endUser1 = await prisma.user.create({
    data: {
      name: 'Michael Brown',
      email: 'michael@company.com',
      password: hashedPassword,
      role: UserRole.END_USER,
      jobTitle: 'Marketing Executive',
      department: 'Marketing',
    },
  })

  const endUser2 = await prisma.user.create({
    data: {
      name: 'Lisa Wilson',
      email: 'lisa@company.com',
      password: hashedPassword,
      role: UserRole.END_USER,
      jobTitle: 'Finance Analyst',
      department: 'Finance',
    },
  })

  // ─── Agent Profiles ─────────────────────────────────────────
  await prisma.agent.create({ data: { userId: adminUser.id, departmentId: itDept.id } })
  await prisma.agent.create({ data: { userId: managerUser.id, departmentId: itDept.id } })
  await prisma.agent.create({ data: { userId: agent1.id, departmentId: itDept.id } })
  await prisma.agent.create({ data: { userId: agent2.id, departmentId: itDept.id } })

  // ─── SLA Policies ───────────────────────────────────────────
  const urgentSla = await prisma.slaPolicy.create({
    data: {
      name: 'Urgent SLA',
      description: 'For urgent/critical tickets',
      priority: TicketPriority.URGENT,
      responseTimeHours: 1,
      resolutionTimeHours: 4,
      isDefault: false,
      escalateAt: 0.5,
    },
  })

  const highSla = await prisma.slaPolicy.create({
    data: {
      name: 'High Priority SLA',
      priority: TicketPriority.HIGH,
      responseTimeHours: 4,
      resolutionTimeHours: 24,
      isDefault: false,
      escalateAt: 2,
    },
  })

  const defaultSla = await prisma.slaPolicy.create({
    data: {
      name: 'Standard SLA',
      description: 'Default SLA policy',
      responseTimeHours: 8,
      resolutionTimeHours: 72,
      isDefault: true,
      escalateAt: 4,
    },
  })

  // ─── Customers ──────────────────────────────────────────────
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Michael Brown',
      email: 'michael@company.com',
      phone: '+1-555-0101',
      company: 'Acme Corp',
      jobTitle: 'Marketing Executive',
      department: 'Marketing',
    },
  })
  const customer2 = await prisma.customer.create({
    data: {
      name: 'Lisa Wilson',
      email: 'lisa@company.com',
      phone: '+1-555-0102',
      company: 'Acme Corp',
      jobTitle: 'Finance Analyst',
      department: 'Finance',
    },
  })
  const customer3 = await prisma.customer.create({
    data: {
      name: 'Robert Chen',
      email: 'robert@company.com',
      phone: '+1-555-0103',
      company: 'Acme Corp',
      jobTitle: 'Software Developer',
      department: 'Engineering',
    },
  })

  // ─── Tickets ────────────────────────────────────────────────
  const now = new Date()

  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-0001',
      subject: 'Laptop not connecting to VPN',
      description: 'My laptop keeps disconnecting from the VPN every 10 minutes. This is affecting my ability to work remotely. I have tried restarting the VPN client and my laptop but the issue persists.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
      category: 'Network',
      subcategory: 'VPN',
      requesterId: endUser1.id,
      customerId: customer1.id,
      agentId: agent1.id,
      departmentId: itDept.id,
      slaPolicyId: highSla.id,
      slaResponseDue: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      slaResolutionDue: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
  })

  const ticket2 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-0002',
      subject: 'Need Microsoft Office license',
      description: 'I joined the team last week but have not received my Microsoft Office license yet. I need access to Word, Excel, and PowerPoint for my work.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.MEDIUM,
      category: 'Software',
      subcategory: 'Licensing',
      requesterId: endUser2.id,
      customerId: customer2.id,
      agentId: agent2.id,
      departmentId: itDept.id,
      slaPolicyId: defaultSla.id,
      slaResponseDue: new Date(now.getTime() + 8 * 60 * 60 * 1000),
      slaResolutionDue: new Date(now.getTime() + 72 * 60 * 60 * 1000),
    },
  })

  const ticket3 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-0003',
      subject: 'Email not syncing on mobile',
      description: 'My corporate email stopped syncing on my iPhone 3 days ago. I have tried removing and re-adding the account but it still does not work.',
      status: TicketStatus.WAITING_FOR_CUSTOMER,
      priority: TicketPriority.MEDIUM,
      category: 'Email',
      subcategory: 'Mobile',
      requesterId: endUser1.id,
      customerId: customer1.id,
      agentId: agent1.id,
      departmentId: itDept.id,
      slaPolicyId: defaultSla.id,
      slaResponseDue: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      slaResolutionDue: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      firstResponseAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
  })

  const ticket4 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-0004',
      subject: 'URGENT: Server down in production',
      description: 'The production web server is down. All users are affected. We are losing revenue every minute. Please treat this as the highest priority.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.URGENT,
      category: 'Infrastructure',
      subcategory: 'Servers',
      departmentId: itDept.id,
      slaPolicyId: urgentSla.id,
      slaResponseDue: new Date(now.getTime() + 1 * 60 * 60 * 1000),
      slaResolutionDue: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    },
  })

  const ticket5 = await prisma.ticket.create({
    data: {
      ticketNumber: 'TKT-0005',
      subject: 'New employee onboarding - Robert Chen',
      description: 'Please set up a new account, laptop, and software for Robert Chen starting Monday.',
      status: TicketStatus.RESOLVED,
      priority: TicketPriority.HIGH,
      category: 'Onboarding',
      requesterId: managerUser.id,
      customerId: customer3.id,
      agentId: agent2.id,
      departmentId: itDept.id,
      slaPolicyId: highSla.id,
      slaResponseDue: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      slaResolutionDue: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      firstResponseAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
    },
  })

  // ─── Comments ───────────────────────────────────────────────
  await prisma.ticketComment.create({
    data: {
      ticketId: ticket1.id,
      authorId: agent1.id,
      content: 'Hi Michael, I am looking into this issue. Can you please let me know which VPN client version you are using? You can find this in the VPN application settings.',
      type: 'PUBLIC_REPLY',
    },
  })
  await prisma.ticketComment.create({
    data: {
      ticketId: ticket1.id,
      authorId: agent1.id,
      content: 'Internal note: Check if this is the same issue as TKT-0003 - may be related to the recent network changes.',
      type: 'INTERNAL_NOTE',
    },
  })
  await prisma.ticketComment.create({
    data: {
      ticketId: ticket2.id,
      authorId: agent2.id,
      content: 'Hi Lisa, I have submitted a license request for you. You should receive the activation email within 2 business hours.',
      type: 'PUBLIC_REPLY',
    },
  })
  await prisma.ticketComment.create({
    data: {
      ticketId: ticket3.id,
      authorId: agent1.id,
      content: 'Hi Michael, we have updated the MDM profile. Please go to Settings > Mail > Add Account and try setting up the account again using your full email address and company password. Let me know if you need help!',
      type: 'PUBLIC_REPLY',
    },
  })

  // ─── Activities ─────────────────────────────────────────────
  await prisma.ticketActivity.create({
    data: { ticketId: ticket1.id, userId: endUser1.id, action: 'CREATED', description: 'Ticket created' },
  })
  await prisma.ticketActivity.create({
    data: { ticketId: ticket1.id, userId: adminUser.id, action: 'ASSIGNED', description: `Assigned to John Agent`, metadata: { agentId: agent1.id } },
  })
  await prisma.ticketActivity.create({
    data: { ticketId: ticket2.id, userId: endUser2.id, action: 'CREATED', description: 'Ticket created' },
  })
  await prisma.ticketActivity.create({
    data: { ticketId: ticket2.id, userId: adminUser.id, action: 'STATUS_CHANGED', description: 'Status changed from Open to In Progress', metadata: { from: 'OPEN', to: 'IN_PROGRESS' } },
  })
  await prisma.ticketActivity.create({
    data: { ticketId: ticket5.id, userId: agent2.id, action: 'RESOLVED', description: 'Ticket resolved', metadata: {} },
  })

  // ─── Assets ─────────────────────────────────────────────────
  const laptop1 = await prisma.asset.create({
    data: {
      assetTag: 'LAP-001',
      name: 'MacBook Pro 14" M3',
      type: AssetType.LAPTOP,
      manufacturer: 'Apple',
      model: 'MacBook Pro 14" M3 Pro',
      serialNumber: 'C02ZK1XXMD6T',
      status: AssetStatus.ACTIVE,
      location: 'London Office',
      purchaseDate: new Date('2024-03-15'),
      purchasePrice: 2499,
      warrantyUntil: new Date('2027-03-15'),
      vendor: 'Apple Store',
      specs: { os: 'macOS 14', ram: '18GB', cpu: 'Apple M3 Pro', storage: '512GB SSD' },
    },
  })
  const laptop2 = await prisma.asset.create({
    data: {
      assetTag: 'LAP-002',
      name: 'Dell XPS 15',
      type: AssetType.LAPTOP,
      manufacturer: 'Dell',
      model: 'XPS 15 9530',
      serialNumber: 'DXPS2024-001',
      status: AssetStatus.ACTIVE,
      location: 'London Office',
      purchaseDate: new Date('2024-01-10'),
      purchasePrice: 1899,
      warrantyUntil: new Date('2027-01-10'),
      vendor: 'Dell Direct',
      specs: { os: 'Windows 11 Pro', ram: '32GB', cpu: 'Intel Core i9-13900H', storage: '1TB SSD' },
    },
  })
  const phone1 = await prisma.asset.create({
    data: {
      assetTag: 'PHN-001',
      name: 'iPhone 15 Pro',
      type: AssetType.PHONE,
      manufacturer: 'Apple',
      model: 'iPhone 15 Pro',
      serialNumber: 'FVFXY2XXMDJD',
      status: AssetStatus.ACTIVE,
      location: 'London Office',
      purchaseDate: new Date('2024-05-01'),
      purchasePrice: 1199,
      warrantyUntil: new Date('2025-05-01'),
    },
  })

  // ─── Asset Assignments ──────────────────────────────────────
  await prisma.assetAssignment.create({
    data: { assetId: laptop1.id, userId: endUser1.id, assignedAt: new Date('2024-03-20') },
  })
  await prisma.assetAssignment.create({
    data: { assetId: laptop2.id, userId: endUser2.id, assignedAt: new Date('2024-01-15') },
  })
  await prisma.assetAssignment.create({
    data: { assetId: phone1.id, userId: endUser1.id, assignedAt: new Date('2024-05-05') },
  })

  // ─── Software Licenses ──────────────────────────────────────
  const m365License = await prisma.softwareLicense.create({
    data: {
      productName: 'Microsoft 365 Business Premium',
      vendor: 'Microsoft',
      licenseType: 'Subscription (Per User)',
      totalSeats: 50,
      purchaseDate: new Date('2024-01-01'),
      expirationDate: new Date('2025-01-01'),
      cost: 22,
    },
  })
  const adobeLicense = await prisma.softwareLicense.create({
    data: {
      productName: 'Adobe Creative Cloud',
      vendor: 'Adobe',
      licenseType: 'Subscription (Per User)',
      totalSeats: 10,
      purchaseDate: new Date('2024-06-01'),
      expirationDate: new Date('2025-06-01'),
      cost: 54.99,
    },
  })

  await prisma.licenseAssignment.create({ data: { licenseId: m365License.id, userId: endUser1.id } })
  await prisma.licenseAssignment.create({ data: { licenseId: m365License.id, userId: endUser2.id } })
  await prisma.licenseAssignment.create({ data: { licenseId: m365License.id, userId: agent1.id } })
  await prisma.licenseAssignment.create({ data: { licenseId: adobeLicense.id, userId: endUser1.id } })

  // ─── Knowledge Base ─────────────────────────────────────────
  const itCat = await prisma.kbCategory.create({
    data: { name: 'IT Guides', description: 'General IT help articles', icon: 'Monitor', sortOrder: 1 },
  })
  const networkCat = await prisma.kbCategory.create({
    data: { name: 'Network & VPN', description: 'Network connectivity guides', icon: 'Wifi', sortOrder: 2 },
  })

  await prisma.kbArticle.create({
    data: {
      categoryId: itCat.id,
      authorId: agent1.id,
      title: 'How to Reset Your Windows Password',
      slug: 'how-to-reset-windows-password',
      content: '<h2>Resetting Your Windows Password</h2><p>If you have forgotten your Windows password, follow these steps...</p><ol><li>Press <strong>Ctrl+Alt+Delete</strong> on the login screen</li><li>Click <em>Reset Password</em></li><li>Follow the on-screen prompts</li></ol><p>If you are still unable to log in, please open a ticket with the IT team.</p>',
      excerpt: 'Step-by-step guide to resetting your Windows password.',
      status: ArticleStatus.PUBLISHED,
      visibility: ArticleVisibility.PUBLIC,
      publishedAt: new Date(),
      tags: ['windows', 'password', 'login'],
      views: 142,
      helpful: 89,
      notHelpful: 3,
    },
  })
  await prisma.kbArticle.create({
    data: {
      categoryId: networkCat.id,
      authorId: agent2.id,
      title: 'Connecting to Company VPN — Step by Step',
      slug: 'connecting-to-company-vpn',
      content: '<h2>Company VPN Connection Guide</h2><p>This article explains how to connect to the company VPN from your device.</p><h3>Prerequisites</h3><ul><li>GlobalProtect VPN client installed</li><li>Your company credentials</li></ul><h3>Steps</h3><ol><li>Open GlobalProtect from your taskbar</li><li>Enter the portal address: <code>vpn.parletech.com</code></li><li>Log in with your company email and password</li></ol>',
      excerpt: 'Learn how to connect to the company VPN securely.',
      status: ArticleStatus.PUBLISHED,
      visibility: ArticleVisibility.PUBLIC,
      publishedAt: new Date(),
      tags: ['vpn', 'network', 'remote'],
      views: 298,
      helpful: 241,
      notHelpful: 12,
    },
  })

  // ─── Automation Rules ────────────────────────────────────────
  await prisma.automationRule.create({
    data: {
      name: 'Auto-assign Urgent Tickets to IT Manager',
      description: 'Automatically assigns urgent tickets to the IT manager',
      trigger: 'TICKET_CREATED',
      conditions: [{ field: 'priority', operator: 'equals', value: 'URGENT' }],
      actions: [{ type: 'ASSIGN_AGENT', value: managerUser.id }, { type: 'SEND_EMAIL', value: 'urgent_notification' }],
      isActive: true,
      runOrder: 1,
    },
  })
  await prisma.automationRule.create({
    data: {
      name: 'Route Network Tickets to IT Department',
      description: 'Assigns tickets with Network category to IT Support dept',
      trigger: 'TICKET_CREATED',
      conditions: [{ field: 'category', operator: 'equals', value: 'Network' }],
      actions: [{ type: 'ASSIGN_DEPARTMENT', value: itDept.id }],
      isActive: true,
      runOrder: 2,
    },
  })
  await prisma.automationRule.create({
    data: {
      name: 'Auto-close Resolved Tickets After 72 Hours',
      description: 'Closes tickets that have been Resolved for over 72 hours without customer response',
      trigger: 'TIME_ELAPSED',
      conditions: [{ field: 'status', operator: 'equals', value: 'RESOLVED' }, { field: 'hoursElapsed', operator: 'greaterThan', value: 72 }],
      actions: [{ type: 'CHANGE_STATUS', value: 'CLOSED' }],
      isActive: true,
      runOrder: 10,
    },
  })

  // ─── System Settings ─────────────────────────────────────────
  await prisma.systemSetting.createMany({
    data: [
      { key: 'company_name', value: 'ParleTech', group: 'general' },
      { key: 'company_email', value: 'support@parletech.com', group: 'general' },
      { key: 'ticket_prefix', value: 'TKT', group: 'tickets' },
      { key: 'ticket_counter', value: '5', group: 'tickets' },
      { key: 'email_notifications', value: 'true', group: 'notifications' },
      { key: 'smtp_host', value: '', group: 'email' },
      { key: 'smtp_port', value: '587', group: 'email' },
      { key: 'smtp_user', value: '', group: 'email' },
      { key: 'smtp_password', value: '', group: 'email' },
      { key: 'auto_close_hours', value: '72', group: 'automation' },
    ],
  })

  // ─── Onboarding Workflow ─────────────────────────────────────
  const onboarding = await prisma.onboardingWorkflow.create({
    data: {
      employeeId: endUser1.id,
      templateName: 'Standard IT Onboarding',
      status: 'COMPLETED',
      startDate: new Date('2024-03-18'),
      dueDate: new Date('2024-03-22'),
    },
  })
  await prisma.onboardingTask.createMany({
    data: [
      { workflowId: onboarding.id, title: 'Create Active Directory account', status: 'COMPLETED', sortOrder: 1, completedAt: new Date('2024-03-18') },
      { workflowId: onboarding.id, title: 'Provision laptop and accessories', status: 'COMPLETED', sortOrder: 2, completedAt: new Date('2024-03-19') },
      { workflowId: onboarding.id, title: 'Assign Microsoft 365 license', status: 'COMPLETED', sortOrder: 3, completedAt: new Date('2024-03-19') },
      { workflowId: onboarding.id, title: 'Setup corporate email on mobile', status: 'COMPLETED', sortOrder: 4, completedAt: new Date('2024-03-20') },
      { workflowId: onboarding.id, title: 'VPN access configuration', status: 'COMPLETED', sortOrder: 5, completedAt: new Date('2024-03-20') },
      { workflowId: onboarding.id, title: 'IT security orientation', status: 'COMPLETED', sortOrder: 6, completedAt: new Date('2024-03-22') },
    ],
  })

  console.log('✅ Database seeded successfully!')
  console.log('\n👤 Demo Accounts:')
  console.log('  Admin:   admin@parletech.com  / Admin@123')
  console.log('  Manager: manager@parletech.com / Admin@123')
  console.log('  Agent:   john@parletech.com   / Admin@123')
  console.log('  Agent:   emily@parletech.com  / Admin@123')
  console.log('  User:    michael@company.com  / Admin@123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
