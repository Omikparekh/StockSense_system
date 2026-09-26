# StockSense — Modern Enterprise Inventory Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Vitest-55_Tests_Passing-6E9F18?style=flat&logo=vitest&logoColor=white)](https://vitest.dev/)

**StockSense** is an enterprise-grade SaaS Inventory Management System designed strictly to replace manual registers, error-prone spreadsheets, and fragmented notes with an auditable, real-time stock control engine.

Built around the core operational philosophy:
$$\text{Receive} \longrightarrow \text{Store} \longrightarrow \text{Transfer} \longrightarrow \text{Deliver} \longrightarrow \text{Adjust} \longrightarrow \text{Track}$$

---

## 1. Key Highlights & Architectural Strengths

- **100% Unified Node.js (TypeScript) Stack:** Engineered from ground up without Python or C++ compilation dependencies, ensuring instant, zero-friction setup across laptops running Windows, macOS, or Linux.
- **Strict ERP Sequences:** Auto-generates standard ERP document sequence numbers:
  - Inbound Receipts: `WH/IN/00001`
  - Outbound Deliveries: `WH/OUT/00001`
  - Internal Transfers: `WH/INT/00001`
  - Stock Adjustments: `WH/ADJ/00001`
- **Dynamic Availability Engine (`Waiting` vs `Ready`):** Automatically computes free stock ($\text{Free Stock} = \text{On Hand} - \text{Reserved}$). Prevents negative inventory by holding delivery orders in `Waiting` state until sufficient stock is received.
- **Compound Warehouse Locations:** Multi-warehouse facility management with compound slash notation (`WH/Stock`, `WH/Output`, `WH/Rack A`) and positive-stock deletion protection.
- **Stock Neutrality in Transfers:** Atomic transfer movements guarantee company-wide inventory balance neutrality ($\sum \text{Stock}_{\text{after}} = \sum \text{Stock}_{\text{before}}$).
- **Immutable Audit Ledger:** Every single physical movement across all operations is atomically logged into `stock_history` with actor attribution, movement route, delta, and timestamps, complete with one-click CSV export.
- **In-Table Quick Reconciliation & Standalone Physical Audits:** Instant inventory count adjustment directly from the product table or the dedicated Adjustments view, calculating deltas and logging `WH/ADJ/...` transactions.
- **Interactive Operational Dashboard:** Live operational KPI cards directly reflecting document deadlines (`Late` $< \text{Today}$, `Today` $= \text{Today}$, `Waiting` for stock) with quick navigation shortcuts.
- **Command Palette (`Ctrl+K`):** Global instant navigation across all modules, products, and operations.

---

## 2. Seeded Demo Credentials

The database is pre-seeded with ready-to-test users, warehouses, demo catalog products, and sample operations:

| Role | Login ID | Email | Password |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin@stocksense.io` | `AdminPassword123!` |
| **Inventory Manager** | `manager` | `manager@stocksense.io` | `ManagerPassword123!` |
| **Warehouse Staff** | `staff` | `staff@stocksense.io` | `StaffPassword123!` |

---

## 3. Quick Start Guide

### Prerequisites
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **npm:** v9.0.0 or higher
- **Git**

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd stocksense
```

### Step 2: Configure Environment
```bash
# On Linux/macOS
cp .env.example .env

# On Windows PowerShell
Copy-Item .env.example .env
```
*(By default, `DATABASE_URL` is set to SQLite WAL mode `sqlite:///./stocksense.db`, so no database installation is needed to start immediately. PostgreSQL is also fully supported by providing a standard connection string).*

### Step 3: Run Backend & Test Suite
```bash
cd backend

# Install dependencies
npm install

# Run automated Vitest test suite (55 tests across 9 suites)
npm test

# Start backend server with hot-reload
npm run dev
```
- **Backend API:** `http://localhost:8000`
- **Health Check:** `http://localhost:8000/api/v1/health`

### Step 4: Run Frontend Client
In a separate terminal:
```bash
cd frontend

# Install dependencies
npm install

# Build production bundle check
npm run build

# Start Vite development server
npm run dev
```
- **Frontend App:** `http://localhost:5173`

---

## 4. API Specification & Endpoints

| Group | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/v1/health` | Health check & engine status | No |
| **Auth** | `POST` | `/api/v1/auth/signup` | Register new user + dispatch OTP | No |
| **Auth** | `POST` | `/api/v1/auth/verify-otp` | Verify 6-digit OTP | No |
| **Auth** | `POST` | `/api/v1/auth/login` | Login & receive JWT + Refresh token | No |
| **Auth** | `POST` | `/api/v1/auth/forgot-password` | Request password reset OTP | No |
| **Auth** | `POST` | `/api/v1/auth/reset-password` | Reset password using OTP | No |
| **Dashboard** | `GET` | `/api/v1/dashboard/kpis` | Real-time operational counters & activity stream | Yes |
| **Products** | `GET` | `/api/v1/products` | Paginated catalog with stock levels & status | Yes |
| **Products** | `POST` | `/api/v1/products` | Create product with SKU uniqueness validation | Yes (Admin/Mgr) |
| **Products** | `GET` | `/api/v1/products/:id` | Detailed product view with location breakdown | Yes |
| **Products** | `PUT` | `/api/v1/products/:id` | Update product attributes | Yes (Admin/Mgr) |
| **Products** | `DELETE`| `/api/v1/products/:id` | Protected delete (blocks if on-hand > 0) | Yes (Admin) |
| **Products** | `POST` | `/api/v1/products/:id/adjust` | In-table quick count reconciliation | Yes |
| **Warehouses** | `GET` | `/api/v1/warehouses` | List warehouses with location count & stock | Yes |
| **Warehouses** | `POST` | `/api/v1/warehouses` | Create warehouse facility | Yes (Admin) |
| **Locations** | `GET` | `/api/v1/warehouses/locations`| List compound location paths (`WH/Stock`) | Yes |
| **Locations** | `POST` | `/api/v1/warehouses/locations`| Create compound location under warehouse | Yes (Admin) |
| **Receipts** | `GET` | `/api/v1/receipts` | List inbound receipts (`WH/IN/...`) | Yes |
| **Receipts** | `POST` | `/api/v1/receipts` | Create inbound receipt with line items | Yes |
| **Receipts** | `POST` | `/api/v1/receipts/:id/mark-ready`| Transition Draft $\rightarrow$ Ready | Yes |
| **Receipts** | `POST` | `/api/v1/receipts/:id/validate`| Validate & atomically increment stock | Yes |
| **Deliveries** | `GET` | `/api/v1/deliveries` | List outbound delivery orders (`WH/OUT/...`)| Yes |
| **Deliveries** | `POST` | `/api/v1/deliveries` | Create delivery order with availability check | Yes |
| **Deliveries** | `POST` | `/api/v1/deliveries/:id/check-stock`| Re-evaluate availability (`Waiting` $\leftrightarrow$ `Ready`) | Yes |
| **Deliveries** | `POST` | `/api/v1/deliveries/:id/validate`| Validate & atomically decrement stock | Yes |
| **Transfers** | `GET` | `/api/v1/transfers` | List internal transfers (`WH/INT/...`) | Yes |
| **Transfers** | `POST` | `/api/v1/transfers` | Create internal transfer | Yes |
| **Transfers** | `POST` | `/api/v1/transfers/:id/validate` | Atomic location shift with neutral balance | Yes |
| **History** | `GET` | `/api/v1/stock-history` | Paginated immutable audit ledger | Yes |
| **History** | `GET` | `/api/v1/stock-history/adjustments`| Filtered physical count adjustments | Yes |
| **History** | `POST` | `/api/v1/stock-history/adjustments`| Record physical inventory audit count | Yes |
| **History** | `GET` | `/api/v1/stock-history/export/csv`| One-click CSV export of audit ledger | Yes |

---

## 5. Automated Test Suites

The backend contains comprehensive integration test suites using Vitest and Supertest:

```text
 ✓ tests/products.test.ts    (12 tests) - CRUD, stock breakdown, in-table reconciliation, SKU checks
 ✓ tests/transfers.test.ts   (5 tests)  - Internal transfers, location balance neutrality
 ✓ tests/deliveries.test.ts  (6 tests)  - Availability engine, stock shortage check, deduction
 ✓ tests/receipts.test.ts    (7 tests)  - Inbound validation, sequence generation, stock increment
 ✓ tests/warehouses.test.ts  (7 tests)  - Multi-facility, compound paths, positive stock protection
 ✓ tests/auth.test.ts        (9 tests)  - Signup OTP, Login JWT, Reset Password OTP, RBAC
 ✓ tests/history.test.ts     (5 tests)  - Stock move ledger, adjustments creation, CSV export
 ✓ tests/dashboard.test.ts   (2 tests)  - Operational counters (Late, Today, Waiting), metrics
 ✓ tests/health.test.ts      (2 tests)  - System health ping and engine verification

 Test Files  9 passed (9)
      Tests  55 passed (55)
```

Run tests anytime with:
```bash
cd backend && npm test
```

---

## 6. Implementation Progress Summary

- [x] **Phase 1 — Foundation & Architecture:** Unified TypeScript stack across frontend and backend, multi-engine SQLite/Postgres DB layer.
- [x] **Phase 2 — Authentication & RBAC:** Signup OTP verification, JWT authentication, Forgot Password OTP flow, and role-based permissions (`admin`, `inventory_manager`, `warehouse_staff`).
- [x] **Phase 3 — Application Shell:** ERP top navigation, warehouse facility switcher, Command Palette (`Ctrl+K`), notifications drawer, mobile drawer.
- [x] **Phase 4 — Products & Catalog:** Table & Kanban views, SKU uniqueness validation, live stock health pills, product detail drawer with location breakdown, quick reconciliation modal.
- [x] **Phase 5 — Warehouses & Locations:** Multi-facility management, compound paths (`WH/Stock`, `WH/Output`), positive stock deletion guards.
- [x] **Phase 6 — Inbound Receipts:** ERP sequence generator (`WH/IN/00001`), Draft $\rightarrow$ Ready $\rightarrow$ Done stepper, dynamic line items, atomic inventory increment on validation.
- [x] **Phase 7 — Outbound Deliveries:** ERP sequence generator (`WH/OUT/00001`), real-time availability check engine (`Waiting` vs `Ready`), atomic deduction on dispatch.
- [x] **Phase 8 — Internal Transfers:** ERP sequence generator (`WH/INT/00001`), location-to-location shifting with company-wide balance neutrality and audit trail.
- [x] **Phase 9 — Stock Move History & Adjustments:** Immutable audit ledger with CSV export, standalone Physical Inventory Adjustments view (`WH/ADJ/00001`), delta computation.
- [x] **Phase 10 — Operational KPI Dashboard:** Live real-time operational KPI cards with Late, Today, Waiting counters, catalog health overview, recent operations and ledger streams.
- [x] **Phase 11 — End-to-End Verification:** 55 tests passing, production build compiled with 0 errors.

---

## 7. License
Proprietary — Internal StockSense SaaS Platform.
