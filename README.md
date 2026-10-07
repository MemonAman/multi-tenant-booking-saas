# Multi-Tenant Appointment & Booking SaaS

A production-oriented, full-stack multi-tenant appointment booking and management SaaS platform built for service-based businesses (barbers, salons, clinics, consultants, photographers).

---

## 🏛️ Architecture Overview

```
                        ┌────────────────────────────────────────┐
                        │             Client Browser             │
                        └───────────────────┬────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
          Public Booking UI                               Business Dashboard
     (/booking/:business-slug)                           (/dashboard/*)
                    │                                               │
                    └───────────────────────┬───────────────────────┘
                                            ▼
                                React Application (Vercel)
                                            │
                                            ▼
                                   Node.js API Layer
                                            │
                       ┌────────────────────┴────────────────────┐
                       ▼                                         ▼
                 Supabase Auth                            Business Logic
                       │                                         │
                       └────────────────────┬────────────────────┘
                                            ▼
                               Supabase PostgreSQL Database
                                  + Row-Level Security (RLS)
                                            │
             ┌──────────────────────────────┼──────────────────────────────┐
             ▼                              ▼                              ▼
          Bookings                       Clients                     Availability
             │
             ▼
    Jobs & Reminders ────────────────► Email / SMS Adapters
             ▲
    Stripe Billing ─────────────────► Webhooks & Subscription State
```

---

## ⚡ Key Architectural Features

1. **Strict Multi-Tenant Row-Level Security (RLS)**:
   - Database policies enforce `auth.uid()` tenant membership for `businesses`, `bookings`, `services`, and `clients`.
   - Business A can never access or mutate Business B's appointments or customer records even if direct database or raw API calls are attempted.

2. **Atomic Double-Booking Concurrency Protection**:
   - Time slot overlap checking formula:
     $$\text{existing\_start} < \text{requested\_end} \quad \text{AND} \quad \text{existing\_end} > \text{requested\_start}$$
   - Server re-validates slot availability at insertion time inside an atomic transaction to ensure zero double-booking when multiple clients submit simultaneously.

3. **Customer CRM & Lifetime Value (LTV)**:
   - Deduplicates client records by normalized email/phone.
   - Computes customer lifetime value, booking counts, last appointment, and next upcoming appointment.
   - Private internal business notes stay isolated to tenant admins.

4. **Automated 24-Hour Reminders Worker**:
   - Idempotent background job identifying appointments 24 hours out.
   - Dispatches notifications, logs delivery audit in `notification_logs`, and prevents duplicate sends.

5. **Monthly SaaS Subscription Billing**:
   - Stripe integration with webhook signature verification (`POST /api/billing/webhook`).
   - Server-side subscription state gating.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, React Router v6, Lucide Icons, Modern Vanilla CSS Design System.
* **Backend**: Node.js, Express.js API Server.
* **Database & Auth**: Supabase PostgreSQL, Supabase Auth, PostgreSQL RLS.
* **Billing**: Stripe Checkout & Webhook handler.
* **Testing**: Node.js test runner (`node --test`).

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
* Node.js v18+ installed.

### 2. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure environment keys are populated:
```ini
PORT=5000
APP_URL=http://localhost:5173
API_URL=http://localhost:5000

VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET=super_secret_cron_token_123
```

### 3. Database Schema & Migration Setup
Run the SQL scripts in your Supabase SQL Editor in the following order:
1. `database/schema.sql` (Creates 14 core tables, foreign keys, indexes, and constraints)
2. `database/rls_policies.sql` (Enables Row-Level Security and tenant isolation policies)
3. `database/seed.sql` (Populates 2 demo tenants: `demo-barber` and `elite-salon`)

### 4. Running Backend Server
```bash
cd backend
npm install
npm run dev
```
Backend API will start at: `http://localhost:5000` (Health Check: `http://localhost:5000/api/health`).

### 5. Running Frontend Web App
```bash
cd frontend
npm install
npm run dev
```
Frontend app will start at: `http://localhost:5173`.

---

## 🧪 Running Automated Tests

Run the backend unit and integration test suite:
```bash
cd backend
npm test
```
The test suite covers:
* Cross-tenant mutation blocking (RLS & Middleware).
* Overlap rule calculations.
* 90-minute service duration slot boundaries.
* Reschedule time validations.

---

## ⏰ Running 24-Hour Reminder Worker Job

To trigger the automated pre-appointment reminder job manually or via cron:
```bash
curl -X POST http://localhost:5000/api/jobs/reminders \
  -H "Authorization: Bearer dev_cron_secret"
```

---

## 💳 Billing Webhook Simulation

Simulate a Stripe subscription update webhook event:
```bash
curl -X POST http://localhost:5000/api/billing/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "customer.subscription.updated",
    "data": {
      "object": {
        "id": "sub_test123",
        "customer": "cus_test123",
        "status": "active",
        "metadata": { "business_id": "11111111-1111-1111-1111-111111111111" }
      }
    }
  }'
```

---

## 📌 Main Route Map

| Path | Audience | Purpose |
| :--- | :--- | :--- |
| `/` | Public | SaaS Landing Page |
| `/booking/:slug` | Public Client | Customer Public Booking Funnel |
| `/dashboard` | Business Owner | Overview Metrics & Activity |
| `/dashboard/calendar` | Business Owner | Interactive Appointments Calendar & Status Actions |
| `/dashboard/bookings` | Business Owner | Filterable Bookings List & Reschedule |
| `/dashboard/clients` | Business Owner | Customer CRM & Private Notes |
| `/dashboard/services` | Business Owner | Manage Services, Durations & Rates |
| `/dashboard/billing` | Business Owner | Monthly SaaS Subscription & Stripe Checkout |

---

## 🔮 Future Improvements

1. **AI Smart Scheduling Assistant**: Natural language slot search calling the authoritative availability API.
2. **AI No-Show Risk Predictor**: Risk scoring based on lead time and cancellation history.
3. **iCal / Google Calendar Sync**: Bi-directional sync with personal calendars.
