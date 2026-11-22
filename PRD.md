# Product Requirements Document (PRD) — Food Delivery Ops Console

**Version:** 2.0 (Production Release)  
**Status:** Approved & In Implementation  
**Owner:** Engineering / Operations  

---

## 1. Problem Statement & Vision

Internal operations teams at fast-growing food delivery startups need a fast, reliable, and tamper-resistant console to manage their catalog, take phone/dispatch orders, move orders through kitchen and courier stages, and govern staff access.

Version 1.0 proved the core concept but contained critical functional bugs, unhandled UI rejections, security vulnerabilities (NoSQL injection vectors, unvalidated inputs, missing token revocation, non-atomic state transitions), broken tests, and missing operational workflows (editing menu items, searching orders/menu, revenue KPIs, staff management).

**Vision for v2.0:** Deliver a hardened, production-grade, full-stack internal operations platform with strict server-side invariants, real-time operational visibility, comprehensive automated test coverage, and zero-friction deployment readiness.

---

## 2. Target Users & Roles (RBAC)

| Role | Description | Permissions |
|---|---|---|
| **Staff** (`staff`) | Dispatchers, kitchen coordinators, phone-order operators | View menu, create orders, view/search orders, edit non-terminal order details, advance/cancel order status, manage own session (login/logout) |
| **Admin** (`admin`) | Operations managers & restaurant owners | All Staff permissions + create/edit/delete menu items, toggle item availability, delete orders, view/manage team accounts (activate/deactivate, promote/demote roles) |

---

## 3. Core Functional Requirements

### 3.1 Authentication & Session Lifecycle
- **FR-AUTH-01**: Staff self-registration (`POST /api/auth/register`) always assigns `role: "staff"`, ignoring any client-supplied role.
- **FR-AUTH-02**: Email/password login (`POST /api/auth/login`) returns a signed HS256 JWT containing `id`, `role`, and `tokenVersion`.
- **FR-AUTH-03**: Session verification (`GET /api/auth/me`) validates token signature, user existence, active status, and `tokenVersion`.
- **FR-AUTH-04**: Server-side logout (`POST /api/auth/logout`) increments `tokenVersion`, immediately revoking all previously issued tokens for that user.
- **FR-AUTH-05**: Frontend validates stored sessions on boot and automatically clears state and redirects to `/login` on any `401 Unauthorized` response.

### 3.2 Menu Catalog Management
- **FR-MENU-01**: All authenticated users can list, search (`?search=`), filter by category (`?category=`) and availability (`?available=`), and paginate menu items.
- **FR-MENU-02**: Admins can create (`POST`), fully edit (`PUT` — name, price, category, description, imageUrl, availability), toggle availability, and delete (`DELETE`) menu items.
- **FR-MENU-03**: Prices must be non-negative finite numbers rounded to 2 decimal places; `imageUrl` must use `http://` or `https://` or be empty.

### 3.3 Order Management & Lifecycle State Machine
- **FR-ORD-01**: Staff and admins can place orders with customer name, phone, delivery address, payment method (`cash`, `card`, `online`), notes, and line items.
- **FR-ORD-02**: **Server-Side Price Snapshotting** — The backend looks up current menu items, rejects unavailable/non-existent items, consolidates duplicate line items, snapshots `name` and `price`, and computes `totalAmount` server-side.
- **FR-ORD-03**: **Guarded Atomic State Machine** — Orders transition strictly through:
  - `pending` → `confirmed` | `cancelled`
  - `confirmed` → `preparing` | `cancelled`
  - `preparing` → `out_for_delivery` | `cancelled`
  - `out_for_delivery` → `delivered` | `cancelled`
  - `delivered` and `cancelled` are **terminal** (immutable).
- **FR-ORD-04**: Every status transition is recorded in `order.statusHistory` with `status`, `changedBy`, and `changedAt`.
- **FR-ORD-05**: Non-terminal orders can have delivery/contact details edited (`PUT /api/orders/:id`); terminal orders reject edits with `400`.
- **FR-ORD-06**: Orders support status filtering, search (`customerName`, `customerPhone`, `deliveryAddress`), pagination, and admin-only deletion.

### 3.4 Operational Analytics & Team Management
- **FR-OPS-01**: `GET /api/orders/stats` provides live KPI metrics: total orders, active orders, delivered orders, cancelled orders, total revenue (excluding cancelled), today's order count, and breakdown by status.
- **FR-TEAM-01**: Admins can list all staff/admin accounts (`GET /api/users`) and update `role` or `isActive` (`PATCH /api/users/:id`).
- **FR-TEAM-02**: Admins cannot demote or deactivate their own account (prevents accidental lockout).

---

## 4. Non-Functional Requirements

- **Security**: Zero NoSQL injection vectors, strict input validation, Helmet security headers, strict CORS allowlist in production, constant-time login comparison, rate limiting with proxy awareness, safe URL validation, and server-side token revocation.
- **Reliability**: Atomic status updates (optimistic concurrency), graceful shutdown (`SIGTERM`/`SIGINT`), `/health` readiness check reflecting DB state, React `ErrorBoundary`, and safe API JSON parsing with request timeouts.
- **Testing**: Automated unit tests, integration tests, security regression tests (backend), and frontend unit/component tests runnable via a single `npm test` command.
- **Performance**: Indexed MongoDB queries, lean pagination limits (`max 100`), Vite production bundle optimization.

---

## 5. Out of Scope (Future Roadmap)
- Real-time WebSocket / SSE push notifications for kitchen displays
- Payment gateway charge processing (Stripe/JazzCash)
- Courier GPS live tracking & customer-facing storefront
- Multi-tenant restaurant chains
