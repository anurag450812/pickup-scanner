import { NavLink } from 'react-router-dom';
import { Home, ScanLine, List, Search } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/scan', label: 'Scan', icon: ScanLine },
  { to: '/list', label: 'List', icon: List },
  { to: '/search', label: 'Search', icon: Search },
];

export function BottomNav() {
  return (
    <nav className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="grid grid-cols-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex flex-col items-center gap-1 py-3 text-[11px] font-medium ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`flex h-9 w-9 items-center justify-center rounded-md border ${
                  isActive
                    ? 'border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-300'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                }`}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 2} />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
