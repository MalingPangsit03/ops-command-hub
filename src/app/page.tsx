import { WorkflowFilterBar } from '@/components/WorkflowFilterBar';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import {
  resolveApproval,
  updateWorkflowStatus,
  createWorkflow,
  createApprovalRequest,
  createUser,
  updateUserRole,
  setActiveOperator,
  createAnnouncement,
} from './actions/ops';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  DollarSign,
  Megaphone,
  Plus,
  ArrowRight,
  Building2,
  ShieldCheck,
  PieChart,
  Users,
  UserPlus,
  Download,
  Lock,
  Send,
} from 'lucide-react';
import { ApprovalStatus, Role, WorkStatus } from '@prisma/client';
import { Suspense } from 'react';

type SearchParams = Promise<{
  q?: string;
  dept?: string;
  status?: string;
  assignee?: string;
}>;

export default function OpsCommandCenter({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
          Loading OpsCore Command Center...
        </div>
      }
    >
      <DashboardContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({
  searchParamsPromise,
}: {
  searchParamsPromise: SearchParams;
}) {
  const cookieStore = await cookies();
  const activeUserId = cookieStore.get('opscore_active_user')?.value;

  const resolvedParams = await searchParamsPromise;
  const q = resolvedParams.q?.trim() ?? '';
  const dept = resolvedParams.dept ?? 'ALL';
  const status = resolvedParams.status ?? 'ALL';
  const assignee = resolvedParams.assignee ?? 'ALL';

  const workflowWhere: {
    departmentId?: string;
    status?: WorkStatus;
    assigneeId?: string | null;
    OR?: Array<{
      title?: { contains: string; mode: 'insensitive' };
      description?: { contains: string; mode: 'insensitive' };
    }>;
  } = {};

  if (dept && dept !== 'ALL') {
    workflowWhere.departmentId = dept;
  }
  if (
    status &&
    status !== 'ALL' &&
    ['BACKLOG', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].includes(status)
  ) {
    workflowWhere.status = status as WorkStatus;
  }
  if (assignee === 'UNASSIGNED') {
    workflowWhere.assigneeId = null;
  } else if (assignee && assignee !== 'ALL') {
    workflowWhere.assigneeId = assignee;
  }
  if (q) {
    workflowWhere.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [
    departments,
    users,
    workflows,
    allWorkflows,
    approvals,
    announcements,
    auditLogs,
  ] = await Promise.all([
    prisma.department.findMany({
      include: {
        requests: { where: { status: 'APPROVED' } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      include: { department: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.workflow.findMany({
      where: workflowWhere,
      include: { department: true, assignee: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.workflow.findMany({
      select: { status: true },
    }),
    prisma.approvalRequest.findMany({
      include: { requester: true, department: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.announcement.findMany({
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const currentUser = users.find((u) => u.id === activeUserId) ?? users[0];
  const isAdmin = currentUser?.role === 'ADMIN';
  const canApprove = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const approvedSpend = approvals
    .filter((a) => a.status === 'APPROVED')
    .reduce((sum, item) => sum + item.amount, 0);
  const activeWorkflows = allWorkflows.filter((w) => w.status !== 'COMPLETED');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Command Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white">
              OC
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">OpsCore Workspace</h1>
              <p className="text-xs text-slate-400">
                Unified Daily Operations, Approvals & Immutable Ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Active Operator Switcher */}
            {currentUser && (
              <form
                action={async (formData: FormData) => {
                  'use server';
                  const id = formData.get('operatorId') as string;
                  if (id) await setActiveOperator(id);
                }}
                className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5"
              >
                <span className="text-[11px] text-slate-400">Acting as:</span>
                <select
                  name="operatorId"
                  defaultValue={currentUser.id}
                  className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900">
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded transition"
                >
                  Switch
                </button>
              </form>
            )}

            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
              PostgreSQL Live Sync
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Company Broadcast Center */}
        <section className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-4">
          {announcements.length > 0 && (
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Megaphone className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Company Broadcast
                    </span>
                    <span className="text-xs text-slate-400">
                      • Posted by {announcements[0].author.name} (
                      {new Date(announcements[0].createdAt).toLocaleDateString()})
                    </span>
                  </div>
                  <h2 className="font-medium text-slate-100">{announcements[0].title}</h2>
                  <p className="text-sm text-slate-300">{announcements[0].content}</p>
                </div>
              </div>
            </div>
          )}

          {/* Previous Broadcasts History */}
          {announcements.length > 1 && (
            <details className="pt-2 border-t border-indigo-500/20">
              <summary className="text-xs text-indigo-300 hover:text-indigo-200 cursor-pointer select-none">
                View {announcements.length - 1} previous broadcast
                {announcements.length - 1 > 1 ? 's' : ''}
              </summary>
              <div className="mt-3 space-y-2.5 pl-4 border-l border-indigo-500/30">
                {announcements.slice(1).map((item) => (
                  <div key={item.id} className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-medium text-slate-200">{item.title}</span>
                      <span>
                        • {item.author.name} (
                        {new Date(item.createdAt).toLocaleDateString()})
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{item.content}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Inline Composer (Managers & Admins Only) */}
          {canApprove && (
            <form
              action={createAnnouncement}
              className="pt-3 border-t border-indigo-500/20 flex flex-col sm:flex-row gap-2"
            >
              <input
                name="title"
                required
                minLength={3}
                placeholder="New broadcast headline..."
                className="sm:w-1/3 bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <input
                name="content"
                required
                minLength={5}
                placeholder="Announcement details for all departments..."
                className="flex-1 bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition shrink-0"
              >
                <Send className="w-3.5 h-3.5" /> Broadcast
              </button>
            </form>
          )}
        </section>

        {/* Executive KPI Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Active Operations</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-3xl font-bold mt-2">{activeWorkflows.length}</p>
            <p className="text-xs text-slate-500 mt-1">Across {departments.length} departments</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Pending Sign-Offs</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-3xl font-bold mt-2 text-amber-400">{pendingApprovals.length}</p>
            <p className="text-xs text-slate-500 mt-1">Zero email bottlenecks</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Approved Spend</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold mt-2">${approvedSpend.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Audited in PostgreSQL ledger</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Active Team</span>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-3xl font-bold mt-2">{users.length}</p>
            <p className="text-xs text-slate-500 mt-1">Connected operators</p>
          </div>
        </section>

        {/* Department Budgets & Visual Progress Bars */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-semibold">Department Budget Allocations</h2>
              <p className="text-xs text-slate-400">
                Real-time spending vs. allocated quarterly limits
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {departments.map((deptItem) => {
              const spent = deptItem.requests.reduce((acc, req) => acc + req.amount, 0);
              const limit = deptItem.budgetLimit || 10000;
              const percentage = Math.min(Math.round((spent / limit) * 100), 100);
              const isHigh = percentage > 75;

              return (
                <div
                  key={deptItem.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-200">{deptItem.name}</span>
                    <span className="text-xs font-mono text-slate-400">
                      ${spent.toLocaleString()} / ${limit.toLocaleString()}
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHigh ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{percentage}% of budget utilized</span>
                    <span className={isHigh ? 'text-amber-400 font-medium' : 'text-slate-400'}>
                      ${(limit - spent).toLocaleString()} remaining
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* User Directory & Role Management */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <div>
                <h2 className="text-base font-semibold">User Directory & Role Management</h2>
                <p className="text-xs text-slate-400">
                  Onboard operators, assign departments, and cycle role permissions
                </p>
              </div>
            </div>
            {!isAdmin && (
              <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Admin access required to edit roles
              </span>
            )}
          </div>

          {isAdmin && (
            <form
              action={createUser}
              className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 flex flex-wrap gap-2"
            >
              <input
                name="name"
                required
                minLength={2}
                placeholder="Full name (e.g. Jordan Lee)"
                className="flex-1 min-w-[160px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
              />
              <input
                name="email"
                type="email"
                required
                placeholder="Email (e.g. jordan@company.io)"
                className="flex-1 min-w-[180px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
              />
              <input
                name="jobTitle"
                required
                minLength={2}
                placeholder="Job title (e.g. Ops Analyst)"
                className="flex-1 min-w-[150px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
              />
              <select
                name="departmentId"
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                name="role"
                defaultValue="MEMBER"
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
              >
                <option value="MEMBER">Member</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <UserPlus className="w-3.5 h-3.5" /> Add Operator
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => {
              const nextRole: Record<Role, Role> = {
                MEMBER: 'MANAGER',
                MANAGER: 'ADMIN',
                ADMIN: 'MEMBER',
              };

              const roleStyles: Record<Role, string> = {
                ADMIN: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                MANAGER: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                MEMBER: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
              };

              return (
                <div
                  key={user.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-sm text-slate-100">{user.name}</h3>
                      <p className="text-xs text-slate-400">{user.jobTitle}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{user.email}</p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        roleStyles[user.role]
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400">{user.department.name}</span>
                    {isAdmin && (
                      <form
                        action={async () => {
                          'use server';
                          await updateUserRole(user.id, nextRole[user.role]);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition"
                        >
                          Set {nextRole[user.role]}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Main Operational Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Workflows + Audit Log */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Operational Workflows</h2>
                <p className="text-xs text-slate-400">
                  Live execution tracker replacing fragmented department spreadsheets
                </p>
              </div>

              <form
                action={createWorkflow}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 flex flex-wrap gap-2"
              >
                <input
                  name="title"
                  required
                  minLength={3}
                  placeholder="New operational task or SOP item..."
                  className="flex-1 min-w-[200px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <select
                  name="departmentId"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  name="assigneeId"
                  defaultValue=""
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <select
                  name="priority"
                  defaultValue="MEDIUM"
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </form>

              <WorkflowFilterBar
                departments={departments.map((d) => ({ id: d.id, name: d.name }))}
                users={users.map((u) => ({ id: u.id, name: u.name }))}
              />

              <div className="space-y-3">
                {workflows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-400">
                    No workflows match the current search or filter criteria.
                  </div>
                ) : (
                  workflows.map((item) => {
                    const nextStatus: Record<WorkStatus, WorkStatus> = {
                      BACKLOG: 'IN_PROGRESS',
                      IN_PROGRESS: 'REVIEW',
                      REVIEW: 'COMPLETED',
                      COMPLETED: 'BACKLOG',
                    };

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.department.name}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${
                                item.priority === 'CRITICAL'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : item.priority === 'HIGH'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.priority}
                            </span>
                            <span className="text-xs font-mono text-indigo-400">{item.status}</span>
                            {item.assignee && (
                              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                Assignee: {item.assignee.name}
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium text-slate-100">{item.title}</h3>
                          {item.description && (
                            <p className="text-xs text-slate-400">{item.description}</p>
                          )}
                        </div>

                        <form
                          action={async () => {
                            'use server';
                            await updateWorkflowStatus(item.id, nextStatus[item.status]);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition"
                          >
                            Advance to {nextStatus[item.status].replace('_', ' ')}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Audit Trail */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h2 className="text-lg font-semibold">Immutable Audit Trail</h2>
                    <p className="text-xs text-slate-400">
                      Real-time compliance log of every state change and sign-off
                    </p>
                  </div>
                </div>
                <a
                  href="/api/exports?type=audit"
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Export Audit CSV
                </a>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/80">
                {auditLogs.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500">No actions logged yet.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                          {log.action}
                        </span>
                        <span className="text-slate-300">{log.details}</span>
                      </div>
                      <span className="text-slate-500 shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Approval Queue */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Approval Queue</h2>
                <p className="text-xs text-slate-400">One-click sign-offs with audit timestamps</p>
              </div>
              <a
                href="/api/exports?type=approvals"
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </a>
            </div>

            {users.length > 0 && departments.length > 0 && (
              <form
                action={createApprovalRequest}
                className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2.5"
              >
                <p className="text-xs font-medium text-slate-300">New Sign-Off Request</p>
                <input
                  name="title"
                  required
                  minLength={3}
                  placeholder="Request title (e.g. Cloud Server Upgrade)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    name="type"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="PROCUREMENT">Procurement</option>
                    <option value="TIME_OFF">Time Off</option>
                    <option value="POLICY_CHANGE">Policy Change</option>
                  </select>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount ($)"
                    defaultValue="0"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    name="departmentId"
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="requesterId"
                    defaultValue={currentUser?.id}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-2 rounded-lg transition"
                >
                  Submit for Approval
                </button>
              </form>
            )}

            <div className="space-y-3">
              {approvals.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400">
                        {req.type} • {req.department.name}
                      </span>
                      <h3 className="font-medium text-sm text-slate-100 mt-0.5">{req.title}</h3>
                    </div>
                    {req.amount > 0 && (
                      <span className="text-sm font-semibold text-emerald-400">
                        ${req.amount.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {req.notes && <p className="text-xs text-slate-400">{req.notes}</p>}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-xs text-slate-500">By {req.requester.name}</span>

                    {req.status === 'PENDING' ? (
                      canApprove ? (
                        <div className="flex items-center gap-2">
                          <form
                            action={async () => {
                              'use server';
                              await resolveApproval(req.id, ApprovalStatus.APPROVED);
                            }}
                          >
                            <button
                              type="submit"
                              className="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium flex items-center gap-1 transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                          </form>
                          <form
                            action={async () => {
                              'use server';
                              await resolveApproval(req.id, ApprovalStatus.REJECTED);
                            }}
                          >
                            <button
                              type="submit"
                              className="px-2.5 py-1 rounded-md bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-medium flex items-center gap-1 transition"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          Awaiting Manager/Admin
                        </span>
                      )
                    ) : (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {req.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}