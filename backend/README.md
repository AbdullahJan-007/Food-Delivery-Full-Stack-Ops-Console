# Food Delivery API

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)

Internal REST API for a food delivery startup's operations team. Staff and
admins authenticate with a JWT to manage the menu and process orders — this
is the backend that runs the kitchen/dispatch side of the business, not a
customer-facing storefront.

## Features

- JWT authentication (`register`, `login`, `me`) with roles: `staff`, `admin`
- Full CRUD on **menu items** — reads for any authenticated user, writes admin-only
- Full CRUD on **orders**, including:
  - Server-side price snapshotting (menu price changes never affect past orders)
  - A guarded status lifecycle (`pending → confirmed → preparing → out_for_delivery → delivered`, or `cancelled` from any non-terminal state — no illegal jumps)
  - Filtering + pagination on list endpoints
- Centralized error handling (Mongoose validation, bad ObjectIds, duplicate keys, JWT errors all normalized into one response shape)
- Rate limiting, Helmet security headers, and CORS configured via env
- A branded status/docs page served at `/`

## Tech stack

Node.js · Express 5 · MongoDB · Mongoose · JWT · bcryptjs

## Project structure

```
backend/
├── src/
│   ├── config/db.js                 # Mongoose connection
│   ├── controllers/                 # Route handler logic
│   ├── middleware/                  # auth, error handling, rate limiting
│   ├── models/                      # User, MenuItem, Order schemas
│   ├── routes/                      # Express routers
│   ├── seed/seedAdmin.js            # Bootstraps the first admin account
│   ├── utils/                       # AppError, JWT signing, status transitions
│   ├── app.js                       # Express app (no DB connection — testable alone)
│   └── server.js                    # Connects DB, then starts listening
├── public/                          # Static docs page (served at "/")
├── .env.example
└── package.json
```

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in `MONGODB_URI` (a local MongoDB instance or an Atlas connection
   string) and set a real `JWT_SECRET`.

3. **Create the first admin account**

   Admins are never created through the public `/register` endpoint — that
   would let anyone register as an admin. Set `ADMIN_NAME`, `ADMIN_EMAIL`
   and `ADMIN_PASSWORD` in `.env`, then run:

   ```bash
   npm run seed
   ```

4. **Run the server**

   ```bash
   npm run dev     # auto-restarts on file changes (node --watch)
   npm start        # plain start, for production
   ```

   Visit `http://localhost:5000` for the docs page, or `http://localhost:5000/health` for a raw health check.

## Authentication

- `POST /api/auth/register` always creates a `staff` account — role can't be
  set from the request body.
- `POST /api/auth/login` returns a JWT valid for `JWT_EXPIRES_IN` (default 7 days).
- Send the token on every protected request:

  ```
  Authorization: Bearer <token>
  ```

- Menu item writes (`POST` / `PUT` / `DELETE`) and order deletion require
  the `admin` role; everything else just requires being logged in.

## API reference

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a staff account |
| POST | `/api/auth/login` | Public | Authenticate, receive a JWT |
| GET | `/api/auth/me` | Staff · Admin | Get the current user |

### Menu items

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/menu-items` | Staff · Admin | List items — `?category=`, `?available=`, `?page=`, `?limit=` |
| GET | `/api/menu-items/:id` | Staff · Admin | Get a single item |
| POST | `/api/menu-items` | Admin | Create an item |
| PUT | `/api/menu-items/:id` | Admin | Update an item |
| DELETE | `/api/menu-items/:id` | Admin | Delete an item |

### Orders

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/orders` | Staff · Admin | List orders — `?status=`, `?page=`, `?limit=` |
| GET | `/api/orders/:id` | Staff · Admin | Get a single order |
| POST | `/api/orders` | Staff · Admin | Place an order |
| PUT | `/api/orders/:id` | Staff · Admin | Update customer/delivery details |
| PATCH | `/api/orders/:id/status` | Staff · Admin | Advance the order status |
| DELETE | `/api/orders/:id` | Admin | Delete an order |

**Example — place an order:**

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "customerName": "Ali Raza",
    "customerPhone": "+92 300 1234567",
    "deliveryAddress": "House 12, Street 4, Abbottabad",
    "items": [{ "menuItem": "<menuItemId>", "quantity": 2 }]
  }'
```

`price` and `totalAmount` are computed server-side from the current menu —
they're intentionally not accepted from the client.

## Design notes

- **Express 5**, not 4 — async route handlers and middleware that throw or
  reject are forwarded to the error handler automatically, so there's no
  `asyncHandler`/try-catch boilerplate in every controller.
- **Price snapshotting** — `Order.items` stores the item's `name` and
  `price` at the moment of purchase, not just a reference, so a later menu
  edit or deletion can't retroactively change a past order's total.
- **Status transitions are guarded** (`src/utils/orderStatus.js`) — an
  order can't jump from `pending` straight to `delivered`, or move
  backwards once `delivered`/`cancelled`.
- **Registration always creates `staff`** — the first `admin` is created
  once via `npm run seed`, closing off self-service privilege escalation.

## License

MIT

## Automated tests

```bash
npm test
```

Runs `node --test` against `tests/`, using `supertest` to hit the real Express app and
`mongodb-memory-server` for an isolated in-memory database — no real MongoDB required to run
the suite, and nothing in it touches your actual data. Covers auth (including the
privilege-escalation and email-enumeration guards), menu item RBAC, and order price
snapshotting + status transitions. See `../REPORT.md` §3 for the full rationale.

## Running as part of the monorepo

This folder is a workspace inside the root `food-delivery-app` project — see the root
`README.md` for the one-command way to run this alongside `frontend/`. It still works as a
fully standalone project too: `npm install && npm run dev` from inside `backend/` on its own.
