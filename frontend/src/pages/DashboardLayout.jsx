import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  BrandLogoIcon,
  OrdersIcon,
  MenuIcon,
  TeamIcon,
  ShieldIcon,
  SettingsIcon,
  LogoutIcon,
} from '../components/Icons';

export default function DashboardLayout() {
  const { user, organization, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const opsLinks = [
    { to: '/admin/orders', label: 'Live Orders', Icon: OrdersIcon },
    { to: '/admin/menu', label: 'Menu Catalog', Icon: MenuIcon },
  ];

  const adminLinks = isAdmin
    ? [
        { to: '/admin/team', label: 'Team & Roles', Icon: TeamIcon },
        { to: '/admin/security', label: 'Traffic Shield', Icon: ShieldIcon },
        { to: '/admin/settings', label: 'Workspace', Icon: SettingsIcon },
      ]
    : [];

  return (
    <div className="min-h-screen bg-canvas flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-surface border-r border-line">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-line">
          <BrandLogoIcon className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-ink truncate">
              {organization?.name || 'Food Delivery'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-ink-muted font-medium">Kitchen Console</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto" aria-label="Admin navigation">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
              Operations
            </p>
            <div className="space-y-1">
              {opsLinks.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-hero-tint text-ember font-semibold'
                        : 'text-ink-muted hover:text-ink hover:bg-surface-alt'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>

          {adminLinks.length > 0 && (
            <div>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
                Administration
              </p>
              <div className="space-y-1">
                {adminLinks.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-hero-tint text-ember font-semibold'
                          : 'text-ink-muted hover:text-ink hover:bg-surface-alt'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-line space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-surface-alt text-ink hover:bg-line/60 transition-colors"
          >
            <span>Customer Storefront</span>
            <span aria-hidden="true">↗</span>
          </a>

          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink truncate">{user?.name}</p>
              <p className="text-[11px] text-ink-muted capitalize truncate">
                {user?.role} · {organization?.plan || 'starter'}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Log out"
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-alt transition-colors cursor-pointer"
            >
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-surface border-b border-line px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogoIcon className="w-7 h-7 shrink-0" />
            <span className="font-display font-bold text-sm text-ink truncate">
              {organization?.name || 'Food Delivery'} Ops
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-surface-alt text-ink"
            >
              Storefront ↗
            </a>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-md border border-line text-ink-muted hover:text-ink"
              aria-label="Log out"
            >
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {[...opsLinks, ...adminLinks].map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive ? 'bg-ink text-white' : 'text-ink-muted bg-surface-alt'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
