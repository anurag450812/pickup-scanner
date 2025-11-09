import { NavLink } from 'react-router-dom';
import { Home, ScanLine, List, Search, Settings } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/scan', label: 'Scan', icon: ScanLine },
  { to: '/list', label: 'List', icon: List },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/95 backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/90">
      <div className="grid grid-cols-5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                      : 'text-inherit'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
