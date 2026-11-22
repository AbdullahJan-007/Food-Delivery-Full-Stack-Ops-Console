# Project Memory & Engineering Knowledge Base

Persistent technical context, audit findings, architectural decisions, and gotchas for the **Food Delivery Ops Console**.

---

## 1. Repository Context
- **Monorepo Type**: npm workspaces (`backend`, `frontend`)
- **Backend Stack**: Node.js 20+, Express 5.2, Mongoose 9.9, JWT (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`, `express-rate-limit`, `morgan`
- **Frontend Stack**: React 19, Vite 8, Tailwind CSS v4, React Router v7, `oxlint`
- **Test Stack**:
  - Backend: `node --test` + `supertest` + `mongodb-memory-server`
  - Frontend: `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom`

---

## 2. Critical Bugs & Vulnerabilities Discovered in v1.0 Audit

### Functional Bugs Found
1. **`backend/tests/orders.test.js` Broken**: Tests created a `staff` user and called `POST /api/menu-items` (admin-only, returns 403), causing `item._id` crashes.
2. **Floating-Point Drift in Order Totals**: `price * quantity` lacked 2-decimal rounding; duplicate `menuItem` entries in one order were not merged.
3. **Terminal Orders Mutable**: `PUT /api/orders/:id` allowed editing `delivered` and `cancelled` orders.
4. **Unhandled Rejections in Frontend**: `OrdersPage.advanceStatus`, `MenuPage.toggleAvailability`, and `MenuPage.handleDelete` had no `try/catch` and no busy states.
5. **Filter Desync on `OrdersPage`**: Advancing an order out of the active filter left stale cards in the wrong tab; creating a new order prepended `pending` into non-matching filters.
6. **Crash on Corrupted `localStorage`**: `AuthProvider.readStoredUser` called `JSON.parse()` without `try/catch`.
7. **Stale/Expired Session Handling**: Frontend never validated stored tokens on boot and never logged out on `401`.
8. **`api.js` Non-JSON Crash**: `await res.json()` crashed with `SyntaxError` on HTML/plain-text proxy errors; no fetch timeout; unencoded query parameters.
9. **Missing Core Ops UI Features**: No menu item edit UI (despite backend `PUT`), no search, no order `paymentMethod`/`notes` inputs, no admin order delete, no KPI stats, no staff registration UI, no team management.
10. **Mongoose 9 Update Option**: `findByIdAndUpdate` should use `returnDocument: 'after'` instead of deprecated `new: true` where applicable.

### Security Vulnerabilities Found (Defensive Audit)
1. **SEC-01 (High)**: NoSQL injection via unvalidated `req.query.category`, `req.query.status`, and non-string `req.body` fields (`email`, `password`, `items[].menuItem`).
2. **SEC-02 (High)**: Unvalidated `JWT_SECRET` on boot, unpinned JWT algorithm, no `tokenVersion` for server-side logout/revocation.
3. **SEC-03 (High)**: Login timing side-channel (skipped `bcrypt.compare` on missing user).
4. **SEC-04 (Medium)**: CORS wildcard `*` fallback in production + untrimmed origins; missing `trust proxy` setting.
5. **SEC-05 (Medium)**: Missing size limit on `express.urlencoded`; no upper bounds on order item count or quantity.
6. **SEC-06 (Medium)**: Unvalidated `MenuItem.imageUrl` allowing `javascript:` / `data:` URLs.
7. **SEC-07 (Medium)**: TOCTOU race condition in `PATCH /api/orders/:id/status` (non-atomic read-then-save).
8. **SEC-08 (Medium)**: Open redirect risk via unvalidated `location.state.from` in `LoginPage`.
9. **SEC-09 (Low)**: `errorHandler` did not handle malformed JSON (`SyntaxError` with `status === 400`) or `entity.too.large` (`413`) cleanly.

---

## 3. Environment & Runtime Gotchas
- **Mongoose 9 async `pre('save')`**: Do NOT accept or call `next()` in async hooks — return/resolve the promise directly.
- **Express 5**: `req.query` is a getter on `IncomingMessage` in Express 5 (read-only property on `req` if assigned directly). Sanitize `req.query` in-place (mutating object keys) rather than reassigning `req.query = ...`!
- **Rate Limiter in Tests**: Skip rate limiting when `NODE_ENV === 'test'` unless explicitly enabled via `ENABLE_RATE_LIMIT_IN_TEST=true` so integration tests never hit flaky 429s while rate-limiter tests can still verify it.
- **Windows Paths / PowerShell**: Always use cross-platform Node scripts or forward slashes in configs.
