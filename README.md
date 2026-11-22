# Food Delivery — Full-Stack Ops Console (v2.0 Production)

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-47A248?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![CI](https://img.shields.io/badge/tests-unit%20%2B%20integration%20%2B%20security-brightgreen)

A hardened, production-ready internal operations console for a food delivery startup. Staff and admins authenticate with revocable HS256 JWTs, manage the menu catalog, process orders through an atomic guarded lifecycle state machine, monitor live operational KPIs, and administer team access.

---

## Documentation Suite

| Document | Purpose |
|---|---|
| [PRD.md](./PRD.md) | Product requirements, RBAC matrix, functional & non-functional specs |
| [architecture.md](./architecture.md) | System topology, middleware pipeline, ER diagram & full API surface |
| [design.md](./design.md) | Design tokens, typography, component patterns & accessibility standards |
| [rules.md](./rules.md) | Non-negotiable security, backend, frontend & release engineering rules |
| [memory.md](./memory.md) | Technical knowledge base, v1.0 audit findings & runtime gotchas |
| [tracker.md](./tracker.md) | Live engineering & security remediation tracker |
| [REPORT.md](./REPORT.md) | Project report & deployment walkthrough |

---

## Key Capabilities (v2.0)

- **Hardened Auth & RBAC**: HS256 algorithm pinning, `issuer`/`audience` claims, `tokenVersion` server-side session revocation (`POST /api/auth/logout`), constant-time login timing protection, and strict role-based access (`staff` vs `admin`).
- **Defense-in-Depth Security**: Recursive NoSQL operator sanitization (`$` / `.`), strict query/body validation, `http:`/`https:` URL validation on `imageUrl`, Helmet headers, `X-Request-Id` correlation, `10kb` JSON & URL-encoded body limits, proxy-aware rate limiting, and fail-fast production environment validation.
- **Atomic Order Lifecycle**: Server-side price snapshotting, duplicate line-item consolidation, 2-decimal monetary rounding, `statusHistory` audit trail, terminal order immutability, and atomic optimistic concurrency (`findOneAndUpdate`) on status transitions.
- **Full Ops Console UI**: Live KPI dashboard (`GET /api/orders/stats`), search & filters on Orders and Menu, inline Menu Item editor, payment method & kitchen notes, Toast notifications, React `ErrorBoundary`, global `401` auto-logout, and Admin Team Management (`/team`).
- **Automated CI & Testing**: Backend unit tests, integration tests, defensive security regression tests, frontend unit tests, `oxlint`, Vite production build, and GitHub Actions CI (`.github/workflows/ci.yml`).

---

## Getting Started

**Prerequisites:** Node.js 20+, MongoDB (local or Atlas).

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
npm run seed
npm run dev
```

- **Backend API**: `http://localhost:5000` (health readiness at `/health`)
- **Frontend Console**: `http://localhost:5173`

---

## Scripts

```bash
npm run dev            # Start backend & frontend together (Vite proxies /api -> localhost:5000)
npm run ci             # Full CI gate: lint + typecheck + backend/frontend tests + production build
npm run lint           # Lint BOTH backend & frontend with oxlint
npm run typecheck      # Typecheck BOTH backend & frontend with tsc --noEmit
npm test               # Run all backend (unit + integration + SaaS + security) & frontend tests
npm run build          # Build production frontend bundle
npm run seed           # Seed default SaaS workspace, admin account & starter menu
docker compose up      # Run MongoDB + Backend + Frontend together in containers
```
