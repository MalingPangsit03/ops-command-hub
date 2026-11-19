# OpsCore Workspace

**OpsCore** is a unified, role-based enterprise operations workspace designed to replace fragmented departmental spreadsheets and email approval chains with a single, auditable command center.

---

## Key Capabilities

* **Server-Enforced Role-Based Access Control (RBAC):** Live session-based operator switching (`ADMIN`, `MANAGER`, `MEMBER`) enforced at the Next.js Server Action layer.
* **Operational Workflow Engine:** Full task lifecycle tracking (`BACKLOG` → `IN_PROGRESS` → `REVIEW` → `COMPLETED`) with operator assignment, priority tiers, and URL-backed multi-criteria filtering and search.
* **Department Budget Allocations & Approval Queue:** Real-time quarterly spend tracking with visual threshold indicators (`>75%` utilization alerts) and one-click sign-offs for expenses, procurement, time off, and policy changes.
* **Company Broadcast Center:** Role-gated announcement composer for `ADMIN` and `MANAGER` operators with collapsible broadcast history.
* **Immutable Audit Trail & Compliance Exports:** Automatic PostgreSQL logging of every state transition, role update, and financial sign-off, paired with one-click `.csv` ledger exports (`/api/exports`).

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Server Actions, Turbopack, Partial Prerendering) |
| **Language** | TypeScript |
| **Database & ORM** | PostgreSQL with Prisma 7 |
| **Validation** | Zod |
| **Styling & Icons** | Tailwind CSS v4, Lucide React |

---

## Role Permission Matrix

| Capability | `MEMBER` | `MANAGER` | `ADMIN` |
| :--- | :---: | :---: | :---: |
| Create & advance operational workflows | Yes | Yes | Yes |
| Submit approval requests | Yes | Yes | Yes |
| Export Audit Trail & Approval Ledger CSVs | Yes | Yes | Yes |
| Approve or reject pending sign-off requests | — | Yes | Yes |
| Publish company-wide broadcasts | — | Yes | Yes |
| Onboard operators & modify user roles | — | — | Yes |

---

## Local Setup & Installation

### 1. Prerequisites
* Node.js 20+
* PostgreSQL 15+ running locally or via Docker

### 2. Install Dependencies
```bash
npm install