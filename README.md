# StockSense — Modern Inventory Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

StockSense is an enterprise-grade Inventory Management System that replaces manual registers, spreadsheet-based stock tracking, and scattered warehouse notes with an auditable, real-time stock control engine.

Built strictly according to operational wireframe standards, it implements deterministic ERP sequence formatting (`WH/IN/00001`, `WH/OUT/00001`), automated inventory availability checking, multi-warehouse location hierarchies, and line-level stock move ledger auditability.

---

## 1. Key Features

- **Inbound Receipts Workflow:** Vendor selection, destination assignment (`WH/Stock`), multi-item line inputs, print slip generation, and atomic validation increasing stock.
- **Outbound Deliveries with Availability Engine:** Real-time stock reservation evaluation. Automatically transitions orders to `Waiting` when items are out-of-stock, or `Ready` when available, preventing negative stock.
- **Internal Transfers:** Frictionless transfer between warehouse locations (`WH/Stock` $\rightarrow$ `WH/Production`, `Rack A` $\rightarrow$ `Rack B`) with company inventory neutrality and location-level balance updates.
- **In-Table Stock Reconciliation:** Quick-reconciliation modal directly on the inventory table to align recorded stock with physical counts with mandatory audit reason logging.
- **Comprehensive Stock Move History:** Complete ledger tracking every item move (`Receipt`, `Delivery`, `Transfer`, `Adjustment`) expanded into discrete line items.
- **Warehouse & Location Hierarchy:** Multi-warehouse configuration with sub-locations (`WH/Stock`, `WH/Output`, `WH/Rack A`) restricted to Admin roles.
- **Dual View Modes:** Toggle between high-density List View (default) and visual Kanban pipeline cards.
- **Smart Operational Dashboard:** Actionable KPI cards displaying pending operation counts along with temporal breakdowns (`Late` $< \text{Today}$, `Today` $= \text{Today}$, `Waiting` for stock).

---

## 2. Technical Architecture

```text
stocksense/
├── frontend/                     # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/ui/        # Design Token UI Components (Button, Badge, Card, Input, Skeleton)
│   │   ├── services/             # Type-safe API Client wrapper
│   │   ├── types/                # Core TypeScript interfaces & status enums
│   │   ├── App.tsx               # Root application view
│   │   ├── index.css             # Tailwind directives & CSS variable tokens
│   │   └── main.tsx              # Application entrypoint
│   ├── tailwind.config.js        # Design tokens: primary indigo, surface, borders, alerts
│   ├── tsconfig.json             # Modern bundler TS configuration
│   ├── vite.config.ts            # Vite dev server & backend proxy
│   └── package.json
│
├── backend/                      # Node.js + TypeScript + Express
│   ├── src/
│   │   ├── api/v1/               # Express API v1 routes & endpoints
│   │   ├── config/               # Environment config & SQLite/PostgreSQL database engine
│   │   ├── core/                 # Security utilities (bcryptjs, JWT)
│   │   ├── middleware/           # Zod error handling & authentication middleware
│   │   ├── types/                # Backend TypeScript interfaces
│   │   ├── app.ts                # Express application configuration
│   │   └── server.ts             # Application bootstrapping & server listener
│   ├── tests/                    # Vitest integration test suite
│   ├── Dockerfile                # Multi-stage production containerfile
│   ├── tsconfig.json             # NodeNext TypeScript configuration
│   └── package.json
│
├── .env.example                  # Documented environment variable template
├── .gitignore                    # Git hygiene (ignoring node_modules, dist, caches, .db)
├── docker-compose.yml            # Multi-container orchestration (Postgres, Node Backend, Frontend)
└── README.md
```

---

## 3. Getting Started & Multi-Laptop Setup

StockSense uses a **unified TypeScript/Node.js stack across both frontend and backend**. This ensures zero compilation discrepancies and flawless cross-laptop compatibility without requiring Python or Visual C++ tools.

### Prerequisites

- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **npm:** v9.0.0 or higher
- **Git**
- *(Optional)* **Docker & Docker Compose**

---

### Method A: Local Development Setup

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd stocksense
```

#### 2. Configure Environment Variables
```bash
# Copy template to .env
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

By default, `DATABASE_URL` in `.env.example` points to `sqlite:///./stocksense.db` for instant, zero-dependency onboarding without installing PostgreSQL locally. For PostgreSQL, simply provide your postgres connection string.

#### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Run automated test suite
npm test

# Start development server with hot-reload
npm run dev
```
Backend API will be running at: `http://localhost:8000`  
Live health check endpoint: `http://localhost:8000/api/v1/health`

#### 4. Frontend Setup
Open a new terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend application will be running at: `http://localhost:5173`

---

### Method B: Docker Compose Setup

Run the entire stack with PostgreSQL, Node.js backend, and Nginx frontend:
```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 4. Design Tokens & Styling System

Centralized design tokens are defined in `frontend/tailwind.config.js` and `frontend/src/index.css`:

| Token | Semantic Purpose | Light Value |
| :--- | :--- | :--- |
| `brand-600` | Primary action / brand identity | `#4f46e5` (Indigo) |
| `surface` | Card & container backgrounds | `#ffffff` |
| `surface-muted` | Page canvas background | `#f8fafc` (Slate 50) |
| `border-subtle` | Card & divider borders | `#e2e8f0` (Slate 200) |
| `content-primary` | High-emphasis body text & headings | `#0f172a` (Slate 900) |
| `content-secondary`| Secondary labels & subtitles | `#475569` (Slate 600) |
| `badge-draft` | Initial document draft state | Slate 100 / Slate 700 |
| `badge-waiting` | Stock unavailable / blocked state | Amber 50 / Amber 700 |
| `badge-ready` | Available / ready to process | Indigo 50 / Indigo 700 |
| `badge-done` | Validated / completed movement | Emerald 50 / Emerald 700 |

---

## 5. Development Roadmap

- [x] **Phase 1 — Foundation (Node.js + TypeScript Backend)**
- [ ] **Phase 2 — Authentication & Roles** (Login, Signup, Email OTP reset flow, JWT, RBAC)
- [ ] **Phase 3 — Application Shell** (Top navigation with Odoo-style operational dropdowns, user profile, notifications)
- [ ] **Phase 4 — Products & Catalog** (SKU, Categories, UoM, Unit Weight, On Hand, Free Stock)
- [ ] **Phase 5 — Warehouses & Locations** (Warehouse Admin CRUD, compound location codes `WH/Stock`, `WH/Output`)
- [ ] **Phase 6 — Inbound Receipts** (Sequence `WH/IN/00001`, line items, validation, print slip)
- [ ] **Phase 7 — Outbound Deliveries** (Sequence `WH/OUT/00001`, availability check engine, `Waiting`/`Ready`)
- [ ] **Phase 8 — Internal Transfers** (Sequence `WH/INT/00001`, location movement balance)
- [ ] **Phase 9 — In-Table Stock Adjustments** (Physical vs recorded reconciliation, delta audit)
- [ ] **Phase 10 — Dashboard** (KPI cards with Late, Today, Waiting metrics, interactive filters)
- [ ] **Phase 11 — Move History / Stock Ledger** (Full audit trail, multi-item line breakdown, CSV/print export)
- [ ] **Phase 12 — Global Search & Notifications** (Ctrl+K palette, stock threshold alerts)
- [ ] **Phase 13 — UI Polish & Micro-interactions**
- [ ] **Phase 14 — QA & End-to-End Tests**
- [ ] **Phase 15 — Release & Production Packaging**

---

## 6. License
Proprietary — Internal Inventory Platform.
