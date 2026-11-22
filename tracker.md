# Project Tracker — Food Delivery Ops Console (v2.0 Upgrade)

Live engineering execution tracker for bugs, security hardening, features, testing, and release readiness.

---

## 1. Documentation & Governance
- [x] `PRD.md` — Product Requirements Document
- [x] `architecture.md` — System Architecture, Mermaid Diagrams & API Surface
- [x] `design.md` — Design System, Tokens & UX Specifications
- [x] `rules.md` — Non-Negotiable Engineering & Security Rules
- [x] `memory.md` — Technical Memory, Audit Findings & Gotchas
- [x] `tracker.md` — Live Task & Release Tracker

---

## 2. Security Audit & Hardening
- [x] **SEC-01**: Recursive NoSQL operator sanitization middleware (`$`, `.`) + strict field type validators
- [x] **SEC-02**: Fail-fast `env.js` config validator + JWT `HS256` pinning + `tokenVersion` revocation (`POST /api/auth/logout`)
- [x] **SEC-03**: Constant-time bcrypt dummy check in `login` to eliminate timing enumeration
- [x] **SEC-04**: Strict trimmed CORS allowlist (no wildcard `*` in production) + `trust proxy`
- [x] **SEC-05**: `10kb` limit on `urlencoded` + upper bounds on order items (50) and quantity (100)
- [x] **SEC-06**: Strict `http:`/`https:` URL validation on `MenuItem.imageUrl`
- [x] **SEC-07**: Atomic optimistic concurrency (`findOneAndUpdate`) in `updateOrderStatus`
- [x] **SEC-08**: Block `PUT /api/orders/:id` on terminal (`delivered`/`cancelled`) orders
- [x] **SEC-09**: Malformed JSON (`400`) & payload-too-large (`413`) error handling + `X-Request-Id`
- [x] **SEC-10**: Frontend safe `localStorage` parsing, `/api/auth/me` boot check, global 401 auto-logout, safe relative redirect guard

---

## 3. Backend Upgrades & Bug Fixes
- [x] Shared `parsePagination` & `validators` utilities
- [x] `Order.statusHistory` audit trail + 2-decimal monetary rounding + duplicate item merging
- [x] Search support on `GET /api/menu-items` and `GET /api/orders` (escaped safe regex)
- [x] `GET /api/orders/stats` operational KPI endpoint
- [x] `GET /api/users` and `PATCH /api/users/:id` admin team management (with self-lockout guard)
- [x] Upgraded `GET /health` with MongoDB readiness check
- [x] Graceful shutdown (`SIGTERM`, `SIGINT`, `uncaughtException`, `unhandledRejection`)

---

## 4. Frontend Upgrades & Bug Fixes
- [x] `ErrorBoundary` + `ToastProvider` notification system
- [x] Hardened `api.js` (safe JSON parsing, 15s timeout, `encodeURIComponent`, 401 listener, all new endpoints)
- [x] Hardened `AuthProvider` + `LoginPage` (auto-redirect if logged in, Sign In / Staff Register toggle)
- [x] Upgraded `OrdersPage` (KPI strip, search, status filters, filter-sync fix, payment/notes, per-order busy state, admin delete with confirm)
- [x] Upgraded `MenuPage` (search, category & availability filters, Edit Menu Item form, busy states, delete confirm)
- [x] New `TeamPage` (`/team` — admin-only staff role & active status management)

---

## 5. Testing, CI/CD & Release Readiness
- [x] Backend Unit Tests (`orderStatus`, `validators`, `env-and-token`)
- [x] Backend Integration Tests (`auth`, `menuItems`, `orders` [fixed], `users`)
- [x] Backend Security Regression Tests (`security.test.js`)
- [x] Frontend Unit Tests (`validation.test.js`, `orderStatus.test.js`)
- [x] GitHub Actions CI/CD workflows (`.github/workflows/ci.yml` + `.github/workflows/cd.yml`)
- [x] Multi-Tenant SaaS Architecture (`Organization` model, strict `organization` isolation, `/api/auth/register-org`, `/api/organization`, `SettingsPage`, plan quotas & currency formatting)
- [x] TypeScript `checkJs` typechecking (`npm run typecheck`) + full backend/frontend `oxlint` (`npm run lint`)
- [x] Docker & Cloud Deploy configs (`docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `render.yaml`, `frontend/vercel.json`)
- [x] Pro Traffic Control & Anti-Abuse Shield (`trafficControl.middleware.js`, burst flood detection, scanner probe blocking, brute-force lockout, auto-quarantine, Admin `/security` live monitor & manual IP block/unblock)
- [x] High-Contrast WCAG AA/AAA Color Theme & Custom SVG Icon/Category Illustration Library (`Icons.jsx`)
- [x] Full verification pass: `npm run ci` (lint + typecheck + all tests + build)
