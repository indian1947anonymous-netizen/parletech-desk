# ParleTech Desk

> **Enterprise-Grade IT Help Desk & Service Management Web Application**  
> Inspired by Zoho Desk with differentiated IT Support features (Asset Management, Software License Tracking, Employee Lifecycle Workflows, and SLA Automation).

---

## 📌 1. Project Overview

**ParleTech Desk** is a standalone, full-stack, production-ready IT service management and ticketing platform designed to minimize manual administrative work for internal IT departments and external support teams.

Unlike static prototypes or generic admin templates, ParleTech Desk provides:
- Complete ticket lifecycle management with public replies and confidential internal notes.
- Contextual user & hardware device telemetry embedded directly in the ticket detail workspace.
- Full IT Asset Management (laptops, monitors, mobile phones, servers, peripherals) tracking assignments and warranties.
- Software License & seat allocation management.
- Employee Onboarding and Offboarding structured task checklists.
- Configurable SLA policies and rule-based automation.
- Role-Based Access Control (RBAC) across Administrators, Support Managers, Support Agents, and End Users.
- Searchable Knowledge Base with rich content, draft/published states, and staff-only SOP visibility.
- Operational reports with CSV export and real-time dashboard analytics.

---

## 🛠️ 2. Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Dynamic API Routes)
- **Language**: TypeScript 5 (Strict Mode)
- **UI & Styling**: Tailwind CSS, Radix UI primitives, Lucide Icons, Sonner toasts
- **Charts & Metrics**: Recharts (dynamic client rendering)
- **Database**: PostgreSQL 15 / 16 (Normalized relational schema with indexes)
- **ORM**: Prisma 6.4.1 (Full schema sync, migrations, and type-safe client)
- **Authentication**: Auth.js (NextAuth v5 beta) with bcrypt password hashing and JWT sessions
- **Email Service**: Nodemailer integration with branded HTML email notification templates
- **Form Validation**: Zod & React Hook Form
- **Deployment**: Docker multi-stage build & docker-compose

---

## 📁 3. Modular Project Structure

```
~/Downloads/Parletech/
├── prisma/
│   ├── schema.prisma              # Comprehensive PostgreSQL database schema
│   └── seed.ts                    # Enterprise demo seed data (users, tickets, assets, SLAs)
├── src/
│   ├── app/
│   │   ├── (auth)/                # Authentication module
│   │   │   ├── login/             # Credentials authentication with demo presets
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/           # Protected workspace routes
│   │   │   ├── dashboard/         # Live metrics, SLA alerts & workload distribution
│   │   │   ├── tickets/           # Ticket list, filters, pagination
│   │   │   │   ├── [id]/          # Unified Ticket Workspace with requester IT panel
│   │   │   │   └── new/           # Structured ticket submission form
│   │   │   ├── customers/         # Customers and contact management
│   │   │   │   └── new/           # Customer creation
│   │   │   ├── agents/            # Staff directory, active ticket counts
│   │   │   ├── departments/       # Department queues and routing
│   │   │   ├── assets/            # IT Asset inventory (laptops, phones, monitors)
│   │   │   │   └── new/           # Hardware asset registration & assignment
│   │   │   ├── licenses/          # Software license allocations & seat utilization
│   │   │   │   └── new/           # Software subscription registration
│   │   │   ├── onboarding/        # Onboarding & Offboarding workflows
│   │   │   │   └── new/           # Workflow generator with auto checklists
│   │   │   ├── knowledge-base/    # Public & Internal documentation hub
│   │   │   │   ├── [slug]/        # Article viewer with view counts
│   │   │   │   └── new/           # Article authoring
│   │   │   ├── reports/           # Analytics, queue metrics & CSV export
│   │   │   ├── settings/          # SLA policies, automation rules, system variables
│   │   │   ├── notifications/     # Real-time activity notifications
│   │   │   └── layout.tsx         # Collapsible sidebar & global search header
│   │   ├── api/                   # RESTful API endpoints for all modules
│   │   │   ├── auth/[...nextauth] # Auth.js API route
│   │   │   ├── tickets/           # Ticket CRUD & SLA assignment
│   │   │   │   └── [id]/comments/ # Public replies & internal notes
│   │   │   ├── customers/         # Customer contacts API
│   │   │   ├── departments/       # Department queues API
│   │   │   ├── users/             # Agent and staff user API
│   │   │   ├── assets/            # Hardware assets API
│   │   │   ├── licenses/          # Software license API
│   │   │   ├── onboarding/        # Onboarding workflows API
│   │   │   ├── kb/                # Knowledge base articles & categories API
│   │   │   ├── notifications/     # Notifications API
│   │   │   └── reports/           # CSV export and KPI aggregation API
│   │   ├── globals.css            # Enterprise CSS theme variables
│   │   ├── layout.tsx             # Root layout with font and toasts
│   │   └── page.tsx               # Auth redirect root
│   ├── components/
│   │   ├── layout/                # Sidebar (collapsible) and Header
│   │   ├── tickets/               # Ticket Workspace, filters, reply editor
│   │   ├── dashboard/             # Recharts status & performance charts
│   │   └── ui/                    # Accessible UI primitives (Radix UI)
│   ├── lib/
│   │   ├── auth.ts                # NextAuth v5 configuration & JWT strategy
│   │   ├── db.ts                  # PrismaClient singleton
│   │   ├── email.ts               # Nodemailer transporter & HTML templates
│   │   ├── permissions.ts         # Role-based access control (RBAC)
│   │   ├── security.ts            # Rate limiting, XSS sanitization, upload guards
│   │   └── utils.ts               # Date formatters, status colors, ticket numbers
│   ├── middleware.ts              # Route protection and session authentication
│   └── types/                     # NextAuth module augmentation
├── docker-compose.yml             # Docker services (PostgreSQL + Web App)
├── Dockerfile                     # Multi-stage optimized production build
├── .env.example                   # Environment configuration template
└── README.md                      # Complete system documentation
```

---

## 👥 4. User Roles and RBAC Permissions

| Role | Access Level & Permissions |
|---|---|
| **Administrator** (`ADMIN`) | Full access: User management, department configuration, SLA rules, system settings, all tickets, asset deletion, and audit logs. |
| **Support Manager** (`MANAGER`) | Department oversight: Ticket assignments, SLA monitoring, agent reassignments, team reports, and onboarding workflows. |
| **Support Agent** (`AGENT`) | Operations: View assigned & department queues, post public replies & confidential internal notes, inspect requester devices, update statuses. |
| **End User** (`END_USER`) | Portal: Submit tickets, view own ticket progress, receive email notifications, read public Knowledge Base articles. |

### Default Demo Credentials (Pre-seeded)
All pre-seeded demo accounts use the password: `Admin@123`

- **Administrator**: `admin@parletech.com`
- **Support Manager**: `manager@parletech.com`
- **Support Agent 1**: `john@parletech.com`
- **Support Agent 2**: `emily@parletech.com`
- **End User**: `michael@company.com`

---

## 🚀 5. Getting Started & Installation

### Prerequisites
- Node.js 18+ (tested on Node.js v22)
- PostgreSQL 15 or higher (or Docker)

### 1. Clone or Open Project
```bash
cd ~/Downloads/Parletech
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your database connection string matches your PostgreSQL server:
```env
DATABASE_URL="postgresql://parletech:parletech123@localhost:5432/parletech_desk"
AUTH_SECRET="your-32-character-secret-key-for-auth"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Setup & Seeding
Push the Prisma schema to create all tables and relationships, then seed demo data:
```bash
# Push schema to PostgreSQL
npm run db:push

# Seed realistic IT help desk demo data
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser and sign in with `admin@parletech.com` / `Admin@123`.

---

## 🐳 6. Production Deployment with Docker

ParleTech Desk includes a production-ready `Dockerfile` and `docker-compose.yml`:

```bash
# Build and run application with dedicated PostgreSQL container
docker-compose --profile full up --build -d
```
The application will be accessible on `http://localhost:3000` with persistent database and file storage volumes.

---

## 📊 7. Core IT Features & Differentiators

1. **Contextual IT Workspace**: When an agent views a ticket, the right panel automatically displays the requester's job title, department, active hardware assets (model, asset tag, serial number), assigned software licenses, and recent support ticket history.
2. **Conversation & Internal Notes**: Switch between external replies (which notify the customer via email) and internal notes (highlighted in amber, strictly hidden from customers).
3. **Automated SLA Timers**: Automatic response and resolution deadline calculation with visual overdue badges.
4. **Hardware Lifecycle Tracking**: Register equipment with serial numbers, warranty dates, and real-time employee assignment.
5. **Software Seat Tracking**: Visual progress bars showing seat saturation and active employee assignments.
6. **Onboarding / Offboarding Checklists**: Generate standard IT checklists for new hires and employee departures with task completion tracking.
7. **CSV Export**: Support managers can download comprehensive ticket reports with one click.
