import 'dotenv/config';
import { PrismaClient, Role, WorkStatus, Priority, RequestType, ApprovalStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const eng = await prisma.department.upsert({
    where: { name: 'Engineering & IT' },
    update: {},
    create: { name: 'Engineering & IT', budgetLimit: 25000 },
  });

  const ops = await prisma.department.upsert({
    where: { name: 'Operations & Logistics' },
    update: {},
    create: { name: 'Operations & Logistics', budgetLimit: 18000 },
  });

  const lead = await prisma.user.upsert({
    where: { email: 'alex.ops@company.io' },
    update: {},
    create: {
      name: 'Alex Rivera',
      email: 'alex.ops@company.io',
      jobTitle: 'Head of Operations',
      role: Role.ADMIN,
      departmentId: ops.id,
    },
  });

  const dev = await prisma.user.upsert({
    where: { email: 'maya.dev@company.io' },
    update: {},
    create: {
      name: 'Maya Lin',
      email: 'maya.dev@company.io',
      jobTitle: 'Systems Architect',
      role: Role.MANAGER,
      departmentId: eng.id,
    },
  });

  await prisma.workflow.createMany({
    data: [
      {
        title: 'Migrate Q4 Inventory Sheets to Central Ledger',
        description: 'Deprecate legacy CSV exports from warehouse teams.',
        status: WorkStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        departmentId: ops.id,
        assigneeId: lead.id,
      },
      {
        title: 'Automate Vendor Invoice Reconciliation',
        description: 'Connect procurement approvals directly to monthly budget tracking.',
        status: WorkStatus.REVIEW,
        priority: Priority.CRITICAL,
        departmentId: eng.id,
        assigneeId: dev.id,
      },
    ],
  });

  await prisma.approvalRequest.createMany({
    data: [
      {
        title: 'AWS & PostgreSQL Managed Cluster Upgrade',
        type: RequestType.PROCUREMENT,
        amount: 1450,
        notes: 'Required for Q4 traffic scaling and automated daily snapshots.',
        status: ApprovalStatus.PENDING,
        requesterId: dev.id,
        departmentId: eng.id,
      },
    ],
  });

  await prisma.announcement.create({
    data: {
      title: 'All Spreadsheet Trackers Deprecated Starting Monday',
      content: 'Please log all cross-department tasks and expense approvals directly inside OpsCore.',
      pinned: true,
      authorId: lead.id,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });