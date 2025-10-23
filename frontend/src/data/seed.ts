import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

async function main() {
  console.log('🌱 Seeding MDMEDIA demo data...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.approval.deleteMany();
  // Delete from rfp_forms table using raw SQL
  await prisma.$executeRaw`DELETE FROM rfp_forms`;
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // USERS - Create 8 demo users with correct roles
  const users = [
    {
      name: 'Administrator',
      email: 'admin@mdmedia.id',
      password: await bcrypt.hash('password', 10),
      role: 'ADMIN',
    },
    {
      name: 'Sales Representative',
      email: 'sales@mdmedia.id',
      password: await bcrypt.hash('password', 10),
      role: 'SALES',
    },
    {
      name: 'Sales Manager',
      email: 'salesmanager@mdmedia.id',
      password: await bcrypt.hash('password', 10),
      role: 'SALES_MANAGER',
    },
    {
      name: 'Product Owner',
      email: 'po@mdmedia.id',
      password: await bcrypt.hash('password', 10),
      role: 'PRODUCT_OWNER',
    },
    {
      name: 'Business Solution',
      email: 'bs@mdmedia.id',
      password: await bcrypt.hash('password', 10),
      role: 'BUSINESS_SOLUTION',
    },
    {
      name: 'BS Manager',
      email: 'bsmanager@mdmedia.id',
      password: await bcrypt.hash('password', 10),
      role: 'BS_MANAGER',
    },
    {
      name: 'Project Manager',
      email: 'pm@mdmedia.id',
      password: await bcrypt.hash('password', 10),
      role: 'PROJECT_MANAGER',
    },
    {
      name: 'Bidding Team',
      email: 'bidding@mdmedia.id',
      password: await bcrypt.hash('password', 10),
      role: 'BIDDING_TEAM',
    },
  ];

  const createdUsers = await Promise.all(
    users.map(async user => {
      return await prisma.user.create({ data: user });
    })
  );

  // Assign managers
  const salesUser = createdUsers.find(u => u.role === 'SALES')!;
  const salesManagerUser = createdUsers.find(u => u.role === 'SALES_MANAGER')!;

  await prisma.user.update({
    where: { id: salesUser.id },
    data: { managerId: salesManagerUser.id },
  });

  // PROJECTS - Create 3 example RFPs
  const projects = [
    {
      projectCode: 'PRJ-2025-001',
      projectName: 'SMS Campaign 2025',
      templateKey: 'sms',
      requestedById: salesUser.id,
      status: 'PENDING_BS_PROPOSAL',
      budgetEstimate: 500000000,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
    },
    {
      projectCode: 'PRJ-2025-002',
      projectName: 'Digital Advertising Q2',
      templateKey: 'digital',
      requestedById: salesUser.id,
      status: 'BS_IN_PROGRESS',
      budgetEstimate: 750000000,
      startDate: new Date('2025-04-01'),
      endDate: new Date('2025-06-30'),
    },
    {
      projectCode: 'PRJ-2025-003',
      projectName: 'Smartcard Printing',
      templateKey: 'smartcard',
      requestedById: salesUser.id,
      status: 'PROPOSAL_FINALIZED',
      budgetEstimate: 300000000,
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-04-30'),
    },
  ];

  const createdProjects = await Promise.all(
    projects.map(async project => {
      return await prisma.project.create({ data: project });
    })
  );

  // RFP FORMS - Create RFP forms for each project
  const bsUser = createdUsers.find(u => u.role === 'BUSINESS_SOLUTION')!;

  const rfpForms = [
    {
      projectId: createdProjects[0].id,
      formData: JSON.stringify({
        client: 'PT. Telkom Indonesia',
        deadline: '2025-03-31',
        budget: 500000000,
        requirements: [
          'SMS blast service for 100,000 recipients',
          'Delivery rate monitoring dashboard',
          'Real-time reporting API',
          'Message template management',
          'Compliance with Indonesian telecom regulations',
        ],
        scope: [
          'Platform setup and configuration',
          'Message template design',
          'API integration with client system',
          'Testing and validation',
          'Training and documentation',
        ],
        timeline: [
          { phase: 'Setup', duration: '3 days' },
          { phase: 'Integration', duration: '5 days' },
          { phase: 'Testing', duration: '2 days' },
          { phase: 'Go-live', duration: '1 day' },
        ],
      }),
      currentStep: 'bs_proposal',
      submittedById: salesUser.id,
      submittedAt: new Date(),
    },
    {
      projectId: createdProjects[1].id,
      formData: JSON.stringify({
        client: 'PT. Bank Central Asia',
        deadline: '2025-06-30',
        budget: 750000000,
        requirements: [
          'Digital advertising campaign across multiple platforms',
          'Social media management',
          'Content creation and design',
          'Performance analytics dashboard',
          'A/B testing capabilities',
        ],
        scope: [
          'Campaign strategy development',
          'Creative content production',
          'Platform setup and optimization',
          'Campaign execution',
          'Performance monitoring and reporting',
        ],
        timeline: [
          { phase: 'Planning', duration: '5 days' },
          { phase: 'Creative', duration: '7 days' },
          { phase: 'Setup', duration: '3 days' },
          { phase: 'Launch', duration: '1 day' },
        ],
      }),
      currentStep: 'bs_proposal',
      submittedById: salesUser.id,
      submittedAt: new Date(),
    },
    {
      projectId: createdProjects[2].id,
      formData: JSON.stringify({
        client: 'PT. Bank Mandiri',
        deadline: '2025-04-30',
        budget: 300000000,
        requirements: [
          'Smartcard printing for 50,000 cards',
          'Personalized card design',
          'Secure delivery and tracking',
          'Quality assurance process',
          'Technical support during deployment',
        ],
        scope: [
          'Card design consultation',
          'Printing production',
          'Quality control',
          'Packaging and logistics',
          'Deployment support',
        ],
        timeline: [
          { phase: 'Design', duration: '4 days' },
          { phase: 'Production', duration: '10 days' },
          { phase: 'QC', duration: '2 days' },
          { phase: 'Delivery', duration: '3 days' },
        ],
      }),
      currentStep: 'completed',
      submittedById: salesUser.id,
      submittedAt: new Date(),
    },
  ];

  // Insert RFP forms using raw SQL
  for (const form of rfpForms) {
    await prisma.$executeRaw`
      INSERT INTO rfp_forms (projectId, formData, currentStep, submittedById, submittedAt)
      VALUES (${form.projectId}, ${form.formData}, ${form.currentStep}, ${form.submittedById}, ${form.submittedAt})
    `;
  }

  // PROPOSALS - Create 2 proposals linked to RFPs
  const bsManagerUser = createdUsers.find(u => u.role === 'BS_MANAGER')!;

  const proposals = [
    {
      projectId: createdProjects[0].id,
      createdById: bsUser.id,
      status: 'draft',
      version: 1,
      watermarkInfo: JSON.stringify({
        text: 'DRAFT - SMS Campaign 2025 - BS - Demo',
        position: 'header',
      }),
    },
    {
      projectId: createdProjects[2].id,
      createdById: bsUser.id,
      status: 'finalized',
      version: 2,
      watermarkInfo: JSON.stringify({
        text: 'FINAL - Smartcard Printing - BS - Approved',
        position: 'footer',
      }),
      approvedAt: new Date(),
    },
  ];

  await Promise.all(
    proposals.map(async proposal => {
      return await prisma.proposal.create({ data: proposal });
    })
  );

  // APPROVALS - Create approval records
  const approvals = [
    {
      projectId: createdProjects[0].id,
      approverId: salesManagerUser.id,
      role: 'SALES_MANAGER',
      decision: 'approved',
      comment: 'RFP requirements are clear and within our capabilities.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: createdProjects[1].id,
      approverId: salesManagerUser.id,
      role: 'SALES_MANAGER',
      decision: 'approved',
      comment: 'Budget allocation approved. Proceed with BS proposal.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: createdProjects[2].id,
      approverId: bsManagerUser.id,
      role: 'BS_MANAGER',
      decision: 'approved',
      comment: 'Proposal meets all requirements. Approved for final submission.',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ];

  await Promise.all(
    approvals.map(async approval => {
      return await prisma.approval.create({ data: approval });
    })
  );

  // PROGRESS ENTRIES - Create progress tracking
  const pmUser = createdUsers.find(u => u.role === 'PROJECT_MANAGER')!;

  const progressEntries = [
    {
      projectId: createdProjects[0].id,
      entryType: 'milestone',
      description: 'Initial client meeting completed',
      percentComplete: 15,
      reportedById: pmUser.id,
    },
    {
      projectId: createdProjects[1].id,
      entryType: 'milestone',
      description: 'Requirements gathering in progress',
      percentComplete: 25,
      reportedById: pmUser.id,
    },
    {
      projectId: createdProjects[2].id,
      entryType: 'milestone',
      description: 'Project delivered successfully',
      percentComplete: 100,
      reportedById: pmUser.id,
    },
  ];

  await Promise.all(
    progressEntries.map(async progress => {
      return await prisma.progress.create({ data: progress });
    })
  );

  // NOTIFICATIONS - Create sample notifications
  const notifications = [
    {
      recipientId: bsUser.id,
      channel: 'email',
      template: 'new_rfp_assigned',
      payloadJson: JSON.stringify({
        projectCode: 'PRJ-2025-001',
        projectName: 'SMS Campaign 2025',
      }),
      status: 'sent',
    },
    {
      recipientId: bsManagerUser.id,
      channel: 'email',
      template: 'proposal_ready_for_review',
      payloadJson: JSON.stringify({
        projectCode: 'PRJ-2025-003',
        projectName: 'Smartcard Printing',
      }),
      status: 'sent',
    },
    {
      recipientId: salesUser.id,
      channel: 'dashboard',
      template: 'proposal_approved',
      payloadJson: JSON.stringify({
        projectCode: 'PRJ-2025-003',
        projectName: 'Smartcard Printing',
      }),
      status: 'sent',
    },
  ];

  await Promise.all(
    notifications.map(async notification => {
      return await prisma.notification.create({ data: notification });
    })
  );

  // ATTACHMENTS - Create sample file attachments
  const attachments = [
    {
      projectId: createdProjects[0].id,
      uploadedById: salesUser.id,
      filename: 'SMS_Campaign_RFP.pdf',
      filepath: '/uploads/SMS_Campaign_RFP.pdf',
      filetype: 'application/pdf',
    },
    {
      projectId: createdProjects[1].id,
      uploadedById: salesUser.id,
      filename: 'Digital_Ads_Brief.docx',
      filepath: '/uploads/Digital_Ads_Brief.docx',
      filetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    {
      projectId: createdProjects[2].id,
      uploadedById: salesUser.id,
      filename: 'Smartcard_Requirements.pdf',
      filepath: '/uploads/Smartcard_Requirements.pdf',
      filetype: 'application/pdf',
    },
  ];

  await Promise.all(
    attachments.map(async attachment => {
      return await prisma.attachment.create({ data: attachment });
    })
  );

  // ISSUES - Create sample issues
  const issues = [
    {
      projectId: createdProjects[1].id,
      title: 'Client requires additional platform integration',
      description:
        'Client wants to integrate with TikTok ads platform in addition to existing platforms.',
      severity: 'medium',
      status: 'open',
      raisedById: bsUser.id,
    },
    {
      projectId: createdProjects[0].id,
      title: 'SMS delivery rate concerns',
      description: 'Client has concerns about SMS delivery rates to certain operators.',
      severity: 'low',
      status: 'resolved',
      raisedById: salesUser.id,
    },
  ];

  await Promise.all(
    issues.map(async issue => {
      return await prisma.issue.create({ data: issue });
    })
  );

  // AUDIT LOGS - Create audit trail
  const auditLogs = [
    {
      userId: salesUser.id,
      action: 'project_created',
      meta: JSON.stringify({
        projectCode: 'PRJ-2025-001',
        projectName: 'SMS Campaign 2025',
      }),
      projectId: createdProjects[0].id,
    },
    {
      userId: bsUser.id,
      action: 'proposal_created',
      meta: JSON.stringify({
        projectCode: 'PRJ-2025-003',
        version: 2,
      }),
      projectId: createdProjects[2].id,
    },
    {
      userId: salesManagerUser.id,
      action: 'approval_granted',
      meta: JSON.stringify({
        decision: 'approved',
        role: 'SALES_MANAGER',
      }),
      projectId: createdProjects[1].id,
    },
  ];

  await Promise.all(
    auditLogs.map(async log => {
      return await prisma.auditLog.create({ data: log });
    })
  );

  console.log('✅ Seed completed successfully.');
  console.log('\n📋 Demo Credentials:');
  console.log('─────────────────────────');
  users.forEach(user => {
    console.log(`${user.role}: ${user.email} / password`);
  });
  console.log('─────────────────────────');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
