'use server';

import { prisma } from '@/lib/prisma';
import { workflowSchema, approvalSchema, userSchema, announcementSchema, } from '@/lib/validations';
import { ApprovalStatus, Role, WorkStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

const ACTIVE_USER_COOKIE = 'opscore_active_user';

export async function setActiveOperator(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  revalidatePath('/');
}

async function getCurrentOperator() {
  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_USER_COOKIE)?.value;

  if (activeId) {
    const user = await prisma.user.findUnique({ where: { id: activeId } });
    if (user) return user;
  }

  // Fallback to first available user (typically Alex Rivera - ADMIN)
  return prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
}

export async function resolveApproval(id: string, status: ApprovalStatus) {
  const actor = await getCurrentOperator();
  if (!actor || actor.role === 'MEMBER') {
    throw new Error('Unauthorized: Only Managers and Admins can resolve approvals.');
  }

  const approval = await prisma.approvalRequest.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      action: `APPROVAL_${status}`,
      details: `${actor.name} (${actor.role}) marked "${approval.title}" as ${status}.`,
      userId: actor.id,
    },
  });

  revalidatePath('/');
}

export async function updateWorkflowStatus(id: string, status: WorkStatus) {
  const actor = await getCurrentOperator();

  const workflow = await prisma.workflow.update({
    where: { id },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      action: 'WORKFLOW_STATUS_CHANGE',
      details: `${actor?.name ?? 'System'} moved "${workflow.title}" to ${status}.`,
      userId: actor?.id ?? null,
    },
  });

  revalidatePath('/');
}

export async function createWorkflow(formData: FormData) {
  const actor = await getCurrentOperator();
  const parsed = workflowSchema.safeParse({
    title: formData.get('title'),
    priority: formData.get('priority'),
    departmentId: formData.get('departmentId'),
    assigneeId: formData.get('assigneeId') || undefined,
  });

  if (!parsed.success) throw new Error('Invalid workflow input.');

  const { title, priority, departmentId, assigneeId } = parsed.data;

  let assigneeName: string | undefined;
  if (assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    assigneeName = assignee?.name;
  }

  await prisma.workflow.create({
    data: {
      title,
      priority,
      departmentId,
      assigneeId: assigneeId || null,
      status: WorkStatus.BACKLOG,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE_WORKFLOW',
      details: assigneeName
        ? `${actor?.name ?? 'System'} created "${title}" assigned to ${assigneeName}.`
        : `${actor?.name ?? 'System'} created operational task: "${title}".`,
      userId: actor?.id ?? null,
    },
  });

  revalidatePath('/');
}

export async function createApprovalRequest(formData: FormData) {
  const parsed = approvalSchema.safeParse({
    title: formData.get('title'),
    type: formData.get('type'),
    amount: formData.get('amount'),
    departmentId: formData.get('departmentId'),
    requesterId: formData.get('requesterId'),
  });

  if (!parsed.success) throw new Error('Invalid approval input.');

  const { title, type, amount, departmentId, requesterId } = parsed.data;

  await prisma.approvalRequest.create({
    data: { title, type, amount, departmentId, requesterId },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE_APPROVAL',
      details: `Submitted ${type} request ($${amount}): "${title}".`,
      userId: requesterId,
    },
  });

  revalidatePath('/');
}

export async function createUser(formData: FormData) {
  const actor = await getCurrentOperator();
  if (!actor || actor.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only Admins can onboard new operators.');
  }

  const parsed = userSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    jobTitle: formData.get('jobTitle'),
    role: formData.get('role'),
    departmentId: formData.get('departmentId'),
  });

  if (!parsed.success) throw new Error('Invalid operator details.');

  const { name, email, jobTitle, role, departmentId } = parsed.data;

  await prisma.user.create({
    data: { name, email, jobTitle, role, departmentId },
  });

  await prisma.auditLog.create({
    data: {
      action: 'ONBOARD_USER',
      details: `${actor.name} onboarded ${name} (${jobTitle}) as ${role}.`,
      userId: actor.id,
    },
  });

  revalidatePath('/');
}

export async function updateUserRole(userId: string, newRole: Role) {
  const actor = await getCurrentOperator();
  if (!actor || actor.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only Admins can modify operator roles.');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  await prisma.auditLog.create({
    data: {
      action: 'ROLE_UPDATED',
      details: `${actor.name} changed ${user.name}'s access level to ${newRole}.`,
      userId: actor.id,
    },
  });

  revalidatePath('/');
}

export async function createAnnouncement(formData: FormData) {
  const actor = await getCurrentOperator();
  if (!actor || actor.role === 'MEMBER') {
    throw new Error('Unauthorized: Only Managers and Admins can publish broadcasts.');
  }

  const parsed = announcementSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!parsed.success) throw new Error('Invalid broadcast content.');

  const { title, content } = parsed.data;

  await prisma.announcement.create({
    data: {
      title,
      content,
      authorId: actor.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'PUBLISH_BROADCAST',
      details: `${actor.name} (${actor.role}) published broadcast: "${title}".`,
      userId: actor.id,
    },
  });

  revalidatePath('/');
}