# Engineering & Security Rules — Food Delivery Ops Console

These rules are non-negotiable standards for every contributor and AI agent working in this repository.

---

## 1. Security Rules (Zero-Tolerance)

1. **Never Trust Client Input**: Every `req.body`, `req.query`, and `req.params` value must be validated for type, format, length, and enum membership before touching Mongoose queries.
2. **Prevent NoSQL Injection**: All incoming request payloads are sanitized recursively to strip keys starting with `$` or containing `.`. Never pass raw `req.query` or `req.body` objects directly into MongoDB filters or updates.
3. **Server-Side Financial Truth**: Order prices and `totalAmount` are ALWAYS computed server-side from current `MenuItem` records and snapshotted onto the order. Never read `price` or `totalAmount` from `req.body`.
4. **Role Escalation Prevention**: `POST /api/auth/register` must ALWAYS hardcode `role: 'staff'`. Admin promotion is only permitted via `npm run seed` or an authenticated Admin via `PATCH /api/users/:id`.
5. **JWT Hardening**:
   - Always pin `algorithms: ['HS256']` in `jwt.sign` and `jwt.verify`.
   - Always validate `user.isActive` and `user.tokenVersion === decoded.tokenVersion` in `protect`.
   - Never commit real secrets; fail fast on boot if `JWT_SECRET` is missing or weak in production.
6. **Constant-Time Auth Failures**: Login must execute a bcrypt comparison even when the email does not exist to prevent timing-based user enumeration, and always return generic `Invalid email or password`.
7. **Safe URLs Only**: Any stored URL (e.g., `imageUrl`) must be validated with `new URL()` and restricted to `http:` or `https:` protocols.
8. **Strict CORS in Production**: Never fall back to wildcard `*` in `NODE_ENV=production`. Trim all configured origins.
9. **Request Size Limits**: Both `express.json` and `express.urlencoded` must enforce strict size limits (`10kb`).

---

## 2. Backend Coding Rules

1. **Express 5 Async Pattern**: Throw `AppError(message, statusCode)` directly inside async route handlers and middleware. Do not wrap every controller in redundant `try/catch` blocks unless translating a specific low-level error.
2. **Atomic State Transitions**: Order status updates must use optimistic concurrency (`findOneAndUpdate({ _id, status: expectedStatus }, ...)`) and append to `statusHistory`.
3. **Terminal Immutability**: Orders in `delivered` or `cancelled` status cannot be edited (`PUT`) or transitioned (`PATCH /status`).
4. **Consistent API Envelope**: Every JSON response uses `{ success: boolean, message: string, data?: any, pagination?: object }`.
5. **Explicit Field Allowlisting**: Never pass `req.body` directly to `Model.create()` or `findByIdAndUpdate()`. Always destructure only allowed fields.
6. **Shared Utilities**: Use shared helpers (`parsePagination`, `validators`, `orderStatus`, `env`) — zero copy-pasted logic across controllers.

---

## 3. Frontend Coding Rules

1. **Zero Unhandled Promise Rejections**: Every async UI handler (click, submit, effect) must handle errors via `try/catch` and surface feedback via Toast or inline error state.
2. **Prevent Double Submissions**: Every mutation button must have a busy/loading state (`disabled={busy}`) while in-flight.
3. **Safe Storage & Redirects**: Wrap `localStorage` JSON parsing in `try/catch`. Validate redirect targets (`startsWith('/') && !startsWith('//')`).
4. **Session Integrity**: Verify stored JWT via `/api/auth/me` on mount and auto-logout on any `401` API response.
5. **Lint & Build Clean**: `npm run lint` (oxlint) and `npm run build` (Vite) must pass with zero errors before any commit or PR.

---

## 4. Testing & Release Rules

1. **Tests Are Mandatory**: Every bug fix and security hardening must include a regression test.
2. **Three-Tier Test Coverage**:
   - Backend Unit Tests (`backend/tests/unit/`)
   - Backend Integration & Security Tests (`backend/tests/integration/`)
   - Frontend Unit & Component Tests (`frontend/src/**/*.test.*`)
3. **Single Command Gate**: `npm test && npm run lint && npm run build` must pass 100% green before pushing to GitHub or deploying.
