'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, RotateCcw } from 'lucide-react';
import { useState, useTransition } from 'react';

interface OptionItem {
  id: string;
  name: string;
}

interface WorkflowFilterBarProps {
  departments: OptionItem[];
  users: OptionItem[];
}

const STATUS_OPTIONS = ['ALL', 'BACKLOG', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] as const;

export function WorkflowFilterBar({ departments, users }: WorkflowFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [departmentId, setDepartmentId] = useState(searchParams.get('dept') ?? 'ALL');
  const [status, setStatus] = useState(searchParams.get('status') ?? 'ALL');
  const [assigneeId, setAssigneeId] = useState(searchParams.get('assignee') ?? 'ALL');

  function applyFilters(next: {
    q?: string;
    dept?: string;
    status?: string;
    assignee?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    const qVal = next.q ?? query;
    const deptVal = next.dept ?? departmentId;
    const statusVal = next.status ?? status;
    const assigneeVal = next.assignee ?? assigneeId;

    if (qVal.trim()) params.set('q', qVal.trim());
    else params.delete('q');

    if (deptVal && deptVal !== 'ALL') params.set('dept', deptVal);
    else params.delete('dept');

    if (statusVal && statusVal !== 'ALL') params.set('status', statusVal);
    else params.delete('status');

    if (assigneeVal && assigneeVal !== 'ALL') params.set('assignee', assigneeVal);
    else params.delete('assignee');

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/?${qs}` : '/');
    });
  }

  function handleReset() {
    setQuery('');
    setDepartmentId('ALL');
    setStatus('ALL');
    setAssigneeId('ALL');
    startTransition(() => {
      router.push('/');
    });
  }

  const hasActiveFilter =
    Boolean(query.trim()) ||
    departmentId !== 'ALL' ||
    status !== 'ALL' ||
    assigneeId !== 'ALL';

  return (
    <div className="rounded-xl border border-slate-800/90 bg-slate-900/50 p-3 flex flex-wrap items-center gap-2">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            applyFilters({ q: val });
          }}
          placeholder="Search tasks or SOPs..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Department Filter */}
      <select
        value={departmentId}
        onChange={(e) => {
          const val = e.target.value;
          setDepartmentId(val);
          applyFilters({ dept: val });
        }}
        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
      >
        <option value="ALL">All Departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {/* Status Filter */}
      <select
        value={status}
        onChange={(e) => {
          const val = e.target.value;
          setStatus(val);
          applyFilters({ status: val });
        }}
        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
      >
        {STATUS_OPTIONS.map((st) => (
          <option key={st} value={st}>
            {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
          </option>
        ))}
      </select>

      {/* Assignee Filter */}
      <select
        value={assigneeId}
        onChange={(e) => {
          const val = e.target.value;
          setAssigneeId(val);
          applyFilters({ assignee: val });
        }}
        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
      >
        <option value="ALL">All Assignees</option>
        <option value="UNASSIGNED">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      {/* Reset Button */}
      {hasActiveFilter && (
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      )}

      {isPending && (
        <span className="text-[11px] text-indigo-400 px-1">Filtering...</span>
      )}
    </div>
  );
}