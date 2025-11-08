import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  actions?: ReactNode;
  padded?: boolean;
  children: ReactNode;
}

export function PageLayout({
  title,
  subtitle,
  backTo,
  actions,
  padded = true,
  children,
}: PageLayoutProps) {
  const mainClassName = padded
    ? 'flex-1 px-4 pb-28 pt-6'
    : 'flex-1 pb-28';

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          {backTo ? (
            <Link
              to={backTo}
              className="inline-flex h-9 w-9 items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <span className="inline-flex h-9 w-9" aria-hidden />
          )}

          <div className="flex flex-1 flex-col items-center text-center">
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>

          {actions ? (
            <div className="flex h-9 items-center justify-end">{actions}</div>
          ) : (
            <span className="inline-flex h-9 w-9" aria-hidden />
          )}
        </div>
      </header>

      <main className={mainClassName}>{children}</main>
    </div>
  );
}
