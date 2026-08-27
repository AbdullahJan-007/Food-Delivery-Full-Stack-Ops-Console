# Food Delivery — Full-Stack Ops Console

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tests](https://img.shields.io/badge/tests-node%3Atest-blue)

A complete internal operations tool for a food delivery startup: staff and admins authenticate
with JWT, manage the menu, and process orders through a real status lifecycle. Built across
four stages — REST API, React client, and this final integration pass that brings both into one
runnable, tested, deployment-ready project.

## Architecture

```
                    ┌─────────────────────┐
  Browser  ───────▶ │  frontend (Vite/React) │  localhost:5173
                    │  React Router · Context │
                    └───────────┬─────────┘
                                │  fetch, JSON, JWT in
                                │  Authorization header
                                ▼
                    ┌─────────────────────┐
                    │  backend (Express)   │  localhost:5000
                    │  JWT auth · RBAC      │
                    │  Mongoose ODM         │
                    └───────────┬─────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │      MongoDB          │
                    └─────────────────────┘
```

Two independently deployable services, one npm workspace for local development. The frontend
never talks to MongoDB directly — every read and write goes through the API, which is the only
thing that enforces auth, roles, price integrity, and the order status lifecycle.

## Project structure

```
food-delivery-app/
├── backend/     Express + MongoDB + JWT API (see backend/README.md)
├── frontend/    React + Vite client (see frontend/README.md)
├── package.json npm workspace root — orchestrates both
└── REPORT.md    Full project report
```

## Getting started

**Prerequisites:** Node.js 20+, a local MongoDB instance running (or an Atlas connection string).

```bash
npm install                                   # installs both workspaces from the root
cp backend/.env.example backend/.env          # fill in MONGODB_URI and JWT_SECRET
cp frontend/.env.local.example frontend/.env.local   # default already points at localhost:5000
npm run seed                                  # creates the first admin account (uses backend/.env)
npm run dev                                   # starts BOTH servers, one command
```

`npm run dev` runs backend and frontend together via `concurrently`, labeled and color-coded in
one terminal. Backend on `localhost:5000`, frontend on `localhost:5173` — no more juggling two
separate windows.

## Testing

```bash
npm test
```

Runs the backend's automated test suite (`node --test`) against an isolated in-memory MongoDB
instance (`mongodb-memory-server`) — no real database needed, and nothing touches your real
data. Covers the routes that actually carry business logic: auth (register/login/RBAC), menu
item CRUD, and orders (price snapshotting, the status transition guard, delete permissions).
See `backend/tests/` and `REPORT.md` for what's covered and why.

## Deployment

Backend and frontend deploy as two separate services — see `REPORT.md` → "Deployment" for the
full walkthrough (env variables per environment, build commands, and a concrete platform
recommendation for each side).

## Full report

`REPORT.md` — architecture decisions and their reasoning, testing strategy, known trade-offs,
and the deployment plan. `backend/README.md` and `frontend/README.md` cover their own API
reference and design notes respectively.
