# OpsCore Workspace (`ops-command-hub`)

**OpsCore** is a unified, role-based enterprise operations workspace built to replace fragmented spreadsheets and ad-hoc approval threads with a single operational hub, real-time budget visibility, and an immutable compliance ledger.

---

## Key Features

* **Server-Enforced Role-Based Access Control (RBAC):** Switch active operators (`ADMIN`, `MANAGER`, `MEMBER`) via an HTTP-only session cookie (`opscore_active_user`) with authorization enforced directly in Next.js Server Actions.
* **Operational Workflows & Filtering:** Create tasks, assign operators, advance statuses (`BACKLOG` → `IN_PROGRESS` → `REVIEW` → `COMPLETED`), and filter or search workflows with URL-synced state (`WorkflowFilterBar`).
* **Department Budget Allocations & Approvals:** Track department budgets against approved spend with utilization progress bars, threshold highlights, and one-click sign-off requests.
* **Company Broadcast Center:** Publish company-wide announcements (restricted to `ADMIN` and `MANAGER`) with collapsible broadcast history.
* **Immutable Audit Trail & CSV Exports:** Record state changes, approvals, role updates, and broadcasts in PostgreSQL, with `.csv` export support via `/api/exports`.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Server Actions, Turbopack) |
| **Language** | TypeScript |
| **Database & ORM** | PostgreSQL with Prisma 7 |
| **Validation** | Zod |
| **Styling & Icons** | Tailwind CSS v4, Lucide React |

---

## RBAC Permission Matrix

| Action / Capability | `MEMBER` | `MANAGER` | `ADMIN` |
| :--- | :---: | :---: | :---: |
| Create & advance operational workflows | Yes | Yes | Yes |
| Submit approval requests | Yes | Yes | Yes |
| Export Audit Trail & Approval CSVs | Yes | Yes | Yes |
| Approve or reject sign-off requests | — | Yes | Yes |
| Publish company broadcasts | — | Yes | Yes |
| Onboard operators & change user roles | — | — | Yes |

---

## Local Setup & Installation

### 1. Prerequisites
* Node.js 20+
* PostgreSQL 15+ running locally or in a container

### 2. Install Dependencies
```bash
npm install