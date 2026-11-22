# Design System & UX Specification — Food Delivery Ops Console

**Version:** 2.0  

---

## 1. Aesthetic Direction

**Editorial Warmth meets Precision Operations.**  
Internal ops tools are often sterile gray tables. This console pairs a warm parchment canvas (`#faf9f6`) and crisp white surfaces (`#ffffff`) with high-contrast charcoal ink (`#17171a`) and an energetic ember-to-paprika brand gradient (`#ff6b3d` → `#e6294f`). Tabular monospace numerals (`JetBrains Mono`) ensure prices, phone numbers, and KPIs scan cleanly at a glance.

---

## 2. Design Tokens (`frontend/src/index.css`)

| Token | Value | Usage & Contrast |
|---|---|---|
| `--color-canvas` | `#f7f6f2` | Page background |
| `--color-hero-tint` | `#ffede2` | Auth page radial glow & subtle highlights |
| `--color-surface` | `#ffffff` | Cards, forms, modals, header |
| `--color-surface-alt` | `#f1efe9` | Subtle icon wells & hover fills |
| `--color-ink` | `#111318` | Primary text & active tabs (~18.6:1 contrast on white) |
| `--color-ink-muted` | `#4e5360` | Secondary labels & metadata (~7.6:1 WCAG AAA contrast on white) |
| `--color-line` | `#e2dfd8` | Crisp borders & dividers |
| `--color-ember` | `#ea580c` | Gradient start, focus rings (>4.6:1 white text contrast) |
| `--color-paprika` | `#d91e43` | Gradient end, prices, destructive hover |

### Custom SVG Iconography & Illustrations (`frontend/src/components/Icons.jsx`)
- Brand cloche logo mark (`BrandLogoIcon`), navigation icons (`Orders`, `Menu`, `Team`, `Shield`, `Settings`, `Logout`), action icons (`Plus`, `Search`, `Edit`, `Trash`, `Check`, `Cancel`, `Refresh`, `Ban`), metadata icons (`Phone`, `MapPin`, `Flame`, `Revenue`, `Activity`), and 5 custom multi-tone category SVG illustrations (`Starters`, `Main Course`, `Desserts`, `Beverages`, `Sides`).

### Typography
- **Display / Headings**: `Space Grotesk` (500, 600, 700)
- **Body / UI**: `Inter` (400, 500, 600)
- **Data / Currency / IDs**: `JetBrains Mono` (400, 500)

---

## 3. Component & Interaction Patterns

### 3.1 Navigation (`Navbar.jsx`)
- Sticky top bar (`h-16`) with brand wordmark, primary nav links (`Orders`, `Menu`, and `Team` for admins), user badge (`name` + `role`), and `Log out` button.
- Active route uses high-contrast `bg-ink text-white` pill.

### 3.2 Feedback & Error Handling
- **Toast Notifications**: Bottom-right stacked toasts (`success` green, `error` red, `info` neutral) with auto-dismiss (4s) and manual close button.
- **Inline Form Validation**: `FormField` renders crisp red border + `text-xs text-red-600` helper text immediately below invalid inputs.
- **Per-Action Busy States**: Every mutation button (status advance, cancel, toggle availability, delete, role switch) disables itself while in-flight to prevent duplicate requests.
- **Destructive Confirmations**: Deleting menu items or orders requires explicit confirmation before firing `DELETE`.

### 3.3 Orders Console (`OrdersPage.jsx`)
- **KPI Strip**: 4 responsive cards showing Total Orders, Active Queue, Delivered, and Total Revenue (Rs).
- **Toolbar**: Search input (customer name, phone, address) + status filter chips (`All`, `Pending`, `Confirmed`, `Preparing`, `Out for delivery`, `Delivered`, `Cancelled`).
- **Order Cards**: Customer info, phone, address, payment method badge (`cash` / `card` / `online`), optional notes callout, itemized line summary, formatted `Rs` total, timestamp, visual `StatusStepper`, and valid next-state action buttons.

### 3.4 Menu Manager (`MenuPage.jsx`)
- **Toolbar**: Search input + category filter chips + availability filter (`All`, `Available`, `Unavailable`).
- **Menu Cards**: Name, price (`Rs`), category badge, description, availability toggle pill, and Admin `Edit` / `Delete` controls.
- **Edit Mode**: Clean inline/panel editor reusing validation rules so admins can update price, category, name, description, and image URL without leaving the page.

### 3.5 Team Directory (`TeamPage.jsx` — Admin Only)
- Lists all staff and admin accounts with status badge (`Active` / `Inactive`), role badge, and safe action controls (self-row controls disabled with tooltip/label to prevent self-lockout).

---

## 4. Accessibility Standards
- Semantic landmarks (`<header>`, `<nav>`, `<main>`).
- All interactive controls use native `<button>` or `<a>` with visible focus rings (`focus:ring-2 focus:ring-ember/40`).
- Status alerts use `role="alert"` / `aria-live="polite"`.
- Color contrast meets WCAG AA for all primary text and interactive buttons.
