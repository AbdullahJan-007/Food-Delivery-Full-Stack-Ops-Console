# Project Report — Food Delivery Ops Console

**Author:** Abdullah Jan
**Scope:** Weeks 4–6 — REST API backend, React frontend, full-stack integration & deployment prep

---

## 1. Executive summary

An internal operations tool for a food delivery startup. Staff and admins log in with JWT,
manage the menu, and move orders through a real lifecycle — pending → confirmed → preparing →
out for delivery → delivered, or cancelled at any point before delivery. Built in three stages
and brought together here into one tested, deployment-ready project.

| Week | Deliverable | Focus |
|---|---|---|
| 4 | `backend/` | Node.js/Express REST API, MongoDB via Mongoose, JWT auth, RBAC |
| 5 | `frontend/` | React + Vite client — login, protected routes, validated forms, hooks |
| 6 | This report + workspace root | Integration, automated tests, deployment prep |

## 2. Architecture decisions and why

**Two services, one workspace.** The backend and frontend are independently deployable —
neither imports code from the other, they only communicate over HTTP. Combining them into an
npm workspace (root `package.json` with `"workspaces": ["backend", "frontend"]`) is purely a
*developer-experience* decision: one `npm install`, one `npm run dev` (via `concurrently`), one
`npm test`. It does not couple them architecturally — each still ships and scales independently.

**Mongoose over the raw MongoDB driver.** Schema-level validation (`required`, `min`, `enum`,
regex `match`), pre-save hooks (password hashing), and population (`Order.createdBy` →
`User`) all come for free and keep validation logic in one declarative place instead of
scattered across controllers.

**Price snapshotting on orders.** `Order.items` stores each item's `name` and `price` at the
moment of purchase, not just a `menuItem` reference. Menu prices change over time; without
this, editing a menu item's price would silently rewrite the total on every past order that
included it. This is the single most important correctness decision in the schema, and it's
directly covered by a test (`orders.test.js` → *"a past order total is unaffected by a later
menu price change"*).

**A guarded status state machine, not a free-form status field.** `src/utils/orderStatus.js`
defines exactly which transitions are legal (`pending → confirmed → preparing →
out_for_delivery → delivered`, cancel from any non-terminal state). Both the backend
(enforcement) and frontend (`nextStatuses()`, mirrored in `frontend/src/lib/orderStatus.js`,
used only to decide which buttons to show) reference the same map, so the UI can never offer an
action the API would reject.

**JWT in `localStorage`, not an httpOnly cookie.** This is a deliberate, documented trade-off,
not an oversight — see §4.

**Express 5, not Express 4.** Async route handlers and middleware that throw or reject are
forwarded to the error handler automatically — no `asyncHandler` wrapper needed in any
controller, confirmed live in testing (see `backend/README.md` → "Design notes").

## 3. Testing strategy

`npm test` runs `node --test` (Node's built-in runner — zero extra test-framework dependency)
against `backend/tests/`, using `supertest` to drive real HTTP requests at the Express app and
`mongodb-memory-server` to spin up a genuine, isolated, in-memory MongoDB instance per test file
— no shared state between test files, and no real database touched.

**What's covered and why these routes specifically:**

- **`auth.test.js`** — registration always creates `staff` regardless of what the client sends
  (privilege-escalation check), duplicate email → 409, login returns the *same* generic error
  for a wrong password and a nonexistent email (enumeration check), `/me` rejects missing and
  malformed tokens.
- **`menuItems.test.js`** — the admin-only RBAC gate on writes (staff gets 403, admin gets 201),
  negative-price rejection, category filtering, delete-then-delete-again returns 404.
- **`orders.test.js`** — the two things most worth protecting: price snapshotting (server
  computes the total, a client-sent price is never trusted) and the status transition guard
  (valid moves succeed, skipping a stage or moving backwards from a terminal state both fail).

**What isn't covered, on purpose:** this is explicitly a "basic" test suite for a capstone, not
a production coverage target. Pagination edge cases, concurrent-write races, and rate-limiter
behavior aren't tested — they'd be the next additions, not omissions from oversight.

## 4. Known limitations and trade-offs

Documented here rather than silently shipped:

- **Auth token storage.** The frontend keeps the JWT in `localStorage`. This is the pragmatic
  choice for local development and grading — the simplest thing that actually works, no cookie
  or CSRF plumbing needed. A real production deployment should use httpOnly, secure cookies
  with server-side session validation instead, so the token is never reachable from JavaScript
  (i.e. immune to XSS-based token theft, which `localStorage` is not).
- **No refresh tokens.** A JWT is valid for `JWT_EXPIRES_IN` (default 7 days) with no revocation
  mechanism short of changing `JWT_SECRET` (which invalidates every session at once). Fine for
  an internal tool with a handful of staff logins; a public-facing product would want short-lived
  access tokens plus a refresh-token rotation flow.
- **No automated frontend tests.** The backend has route-level tests; the frontend is verified
  by `npm run build` + `npm run lint` passing clean, plus manual end-to-end testing (log in,
  place an order, walk it through every status). Component/integration tests (React Testing
  Library) are a natural next addition, not included here to keep the suite "basic" as scoped.
- **Rate limiting is in-memory.** `express-rate-limit`'s default store resets on restart and
  doesn't share state across multiple server instances. Fine for a single-instance deployment;
  a multi-instance production deployment would need a shared store (Redis).

## 5. Deployment

Two independent services. Neither needs the other at build time — only at runtime, via
`VITE_API_URL`.

### Backend

- **Build:** none — it's plain Node.js, no compile step.
- **Start command:** `npm start` (runs `node src/server.js`).
- **Suggested platform:** Render, Railway, or Fly.io — all support "point at a GitHub repo,
  set env vars, deploy" for a plain Node service with zero extra config.
- **Required environment variables in production:**

  | Variable | Production value |
  |---|---|
  | `NODE_ENV` | `production` |
  | `MONGODB_URI` | An Atlas (or other hosted) connection string — not `127.0.0.1` |
  | `JWT_SECRET` | A freshly generated, long random value — never the local dev one |
  | `CORS_ORIGIN` | The deployed frontend's real URL, e.g. `https://food-delivery.vercel.app` |
  | `PORT` | Usually supplied by the platform itself |

### Frontend

- **Build:** `npm run build` (Vite) → static output in `frontend/dist/`.
- **Suggested platform:** Vercel or Netlify — both build and serve a static Vite output with
  zero server-side config.
- **Required environment variable in production:** `VITE_API_URL` set to the deployed backend's
  URL (e.g. `https://food-delivery-api.onrender.com/api`), configured in the platform's
  dashboard, not committed to the repo.

### Deployment checklist

- [ ] Backend `MONGODB_URI` points at a hosted database, not localhost
- [ ] Backend `JWT_SECRET` regenerated for production, not reused from `.env.example`
- [ ] Backend `CORS_ORIGIN` includes the frontend's real deployed URL
- [ ] Frontend `VITE_API_URL` points at the deployed backend, set at build/host time
- [ ] `npm run seed` run once against the production database to create the first admin
- [ ] `npm test` passing before every deploy

## 6. Demo flow

The full loop, in the order it's meant to be shown:

1. Log in with the seeded admin account.
2. **Menu** tab → add two or three items.
3. **Orders** tab → place a new order against those items.
4. Watch the order card's status stepper — advance it through Confirmed → Preparing → Out for
   delivery → Delivered, one click at a time.
5. Filter the order list by status to show the filter chips working against real data.

This sequence exercises every layer at once: JWT auth, role-gated writes, price computation,
and the status state machine — backend and frontend, together.
