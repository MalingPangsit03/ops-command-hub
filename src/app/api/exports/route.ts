import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function escapeCsv(value: unknown): string {
  const str = String(value ?? '');
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type');

  if (type === 'approvals') {
    const approvals = await prisma.approvalRequest.findMany({
      include: { department: true, requester: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'ID',
      'Title',
      'Type',
      'Amount',
      'Status',
      'Department',
      'Requester',
      'Created At',
      'Resolved At',
    ];

    const rows = approvals.map((a) =>
      [
        a.id,
        a.title,
        a.type,
        a.amount,
        a.status,
        a.department.name,
        a.requester.name,
        a.createdAt.toISOString(),
        a.resolvedAt ? a.resolvedAt.toISOString() : '',
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="opscore-approvals-ledger.csv"',
      },
    });
  }

  // Default: Immutable Audit Log export
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  const headers = ['ID', 'Action', 'Details', 'Operator', 'Timestamp'];
  const rows = logs.map((log) =>
    [
      log.id,
      log.action,
      log.details,
      log.user?.name ?? 'System',
      log.createdAt.toISOString(),
    ]
      .map(escapeCsv)
      .join(',')
  );

  const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="opscore-audit-log.csv"',
    },
  });
}