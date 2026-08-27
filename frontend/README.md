# Food Delivery — React Client (Week 5)

A plain React SPA — login flow, protected routes, validated forms, hooks-based state —
consuming the Week 4 backend (`../backend` in this monorepo). Built to the letter of the task's stack:
**React + Hooks + API Integration**, no framework beyond React Router.

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)

## Stack

React 19 · React Router 7 · Vite · plain JavaScript (no TypeScript — matches the task's
stated stack, same as the backend) · Tailwind CSS v4 · self-hosted fonts via Fontsource

## Getting started

Start the backend first (`npm run dev` in `../backend`, running on `localhost:5000`,
with an admin seeded via `npm run seed`), then:

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Opens on `http://localhost:5173`, redirects to `/login`.

## What maps to the task description

| Requirement | Where |
|---|---|
| Login flow | `pages/LoginPage.jsx` — calls the backend, stores the JWT via `AuthProvider` |
| Protected routes | `components/ProtectedRoute.jsx` — a dedicated route-guard component using React Router's `<Navigate>` / `<Outlet>`, wraps the whole `/orders` + `/menu` branch in `App.jsx` |
| Forms with validation | `lib/validation.js` — real field-level rules (email format, password length, phone format, required fields), not just HTML `required`. Every form shows per-field error text, see `components/FormField.jsx` |
| Hooks | `useState`, `useEffect`, `useCallback`, `useMemo`, `useContext` — no class components anywhere |
| State management | React Context (`AuthProvider`) for auth, local `useState` per page for data — no external state library, appropriately scoped for this size of app |
| Clean, responsive UI | Tailwind, mobile-first layouts, same design language as the backend's docs page |

## Auth storage — a deliberate, documented trade-off

The JWT lives in `localStorage`, read directly in `AuthProvider`'s initial state (no
`useEffect` hydration needed here — unlike an SSR framework, this is a plain client-rendered
app with nothing to hydrate against). Simplest thing that works for local dev and grading.
A production deployment should use httpOnly cookies instead so the token isn't reachable
from JS at all — noted here rather than silently doing the "wrong" thing without saying so.

## Design notes

- Same visual identity as the other two pieces of this project (backend docs page, Next.js
  demo) — warm off-white canvas, ember-to-paprika gradient as an accent only, Space Grotesk /
  Inter / JetBrains Mono. Fonts self-hosted via `@fontsource`, no external CDN dependency.
- `lib/orderStatus.js` mirrors the backend's transition guard exactly, so the UI only ever
  offers status moves the API will actually accept.
- `npm run lint` (oxlint) and `npm run build` both pass clean. Two spots have a documented,
  justified `eslint-disable` for `react/set-state-in-effect` — a strict newer rule that wants
  every effect-driven fetch replaced with a data-fetching library, disproportionate for a
  project this size. `AuthContext` is deliberately split across three files
  (`context/AuthContext.js`, `context/AuthProvider.jsx`, `hooks/useAuth.js`) to satisfy Fast
  Refresh's "only export components per file" rule properly rather than suppress it.

## License

MIT
