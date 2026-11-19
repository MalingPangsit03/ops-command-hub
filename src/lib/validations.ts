import { z } from 'zod';

export const workflowSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  departmentId: z.string().cuid(),
  assigneeId: z.string().cuid().optional().or(z.literal('')),
});

export const approvalSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  type: z.enum(['EXPENSE', 'PROCUREMENT', 'TIME_OFF', 'POLICY_CHANGE']),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  departmentId: z.string().cuid(),
  requesterId: z.string().cuid(),
});

export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  jobTitle: z.string().min(2, 'Job title is required').max(100),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']),
  departmentId: z.string().cuid(),
});

export const announcementSchema = z.object({
  title: z.string().min(3, 'Headline must be at least 3 characters').max(120),
  content: z.string().min(5, 'Message must be at least 5 characters').max(500),
});