import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LINKS = [
  { to: '/orders', label: 'Orders' },
  { to: '/menu', label: 'Menu' },
];

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-line bg-surface">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <span className="font-display font-semibold text-lg whitespace-nowrap">
          Food Delivery{' '}
          <span className="bg-gradient-to-br from-ember to-paprika bg-clip-text text-transparent">
            Ops
          </span>
        </span>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-ink text-white' : 'text-ink-muted hover:bg-canvas'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-tight">{user?.name}</p>
            <p className="text-xs text-ink-muted capitalize leading-tight">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-ink-muted hover:text-ink border border-line rounded-lg px-3 py-1.5 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
