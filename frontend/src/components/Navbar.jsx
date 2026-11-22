import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  BrandLogoIcon,
  OrdersIcon,
  MenuIcon,
  TeamIcon,
  ShieldIcon,
  SettingsIcon,
  LogoutIcon,
} from './Icons';

export default function Navbar() {
  const { user, organization, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const links = [
    { to: '/orders', label: 'Orders', Icon: OrdersIcon },
    { to: '/menu', label: 'Menu', Icon: MenuIcon },
    ...(isAdmin
      ? [
          { to: '/team', label: 'Team', Icon: TeamIcon },
          { to: '/security', label: 'Shield', Icon: ShieldIcon },
          { to: '/settings', label: 'Settings', Icon: SettingsIcon },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogoIcon className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm sm:text-base truncate text-ink">
                {organization?.name || 'Food Delivery'}{' '}
                <span className="bg-gradient-to-br from-ember to-paprika bg-clip-text text-transparent">
                  Ops
                </span>
              </span>
              {organization?.plan && (
                <span className="hidden lg:inline-block text-[10px] uppercase tracking-wider font-mono font-semibold px-2 py-0.5 rounded-full bg-hero-tint text-paprika border border-ember/25">
                  {organization.plan}
                </span>
              )}
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Primary navigation">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-ink text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-alt'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold leading-tight text-ink">{user?.name}</p>
            <p className="text-xs text-ink-muted capitalize leading-tight">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink border border-line hover:border-ink-muted rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
          >
            <LogoutIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
