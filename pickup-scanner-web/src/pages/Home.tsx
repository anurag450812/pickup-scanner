import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ScanLine,
  List,
  Search,
  Download,
  Settings,
  Package,
  Clock,
} from 'lucide-react';
import { scanOperations } from '../db/dexie';
import { formatRelativeTime } from '../lib/normalize';
import { PageLayout } from '../components/PageLayout';

const quickActions = [
  {
    to: '/scan',
    icon: ScanLine,
    title: 'Scan parcel',
    description: 'Open camera or add manually',
    accent: 'text-blue-600 dark:text-blue-400',
    badge: 'S',
  },
  {
    to: '/list',
    icon: List,
    title: 'View list',
    description: 'Group, review, and manage scans',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    to: '/search',
    icon: Search,
    title: 'Search & verify',
    description: 'Find matches and confirm parcels',
    accent: 'text-purple-600 dark:text-purple-400',
    badge: '/',
  },
  {
    to: '/import-export',
    icon: Download,
    title: 'Import / export',
    description: 'Back up or restore your data',
    accent: 'text-amber-600 dark:text-amber-400',
  },
  {
    to: '/settings',
    icon: Settings,
    title: 'Preferences',
    description: 'Device, theme, and feedback',
    accent: 'text-slate-600 dark:text-slate-300',
  },
];

export default function Home() {
  const { data: stats } = useQuery({
    queryKey: ['homeStats'],
    queryFn: async () => {
      const [totalScans, latestScan, recentScans] = await Promise.all([
        scanOperations.getScansCount(),
        scanOperations.getLatestScan(),
        scanOperations.getAllScans(),
      ]);

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const scansToday = recentScans.filter((scan) => scan.timestamp >= startOfDay).length;
      const checkedScans = recentScans.filter((scan) => scan.checked).length;

      return {
        totalScans,
        scansToday,
        checkedScans,
        latestScan,
      };
    },
  });

  return (
    <PageLayout title="Pickup Scanner" subtitle="Stay on top of every parcel">
      <div className="space-y-6 pb-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
          <div className="mb-5 flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Today&apos;s snapshot</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">How your team has been scanning</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Total" value={stats?.totalScans ?? 0} tone="default" />
            <StatCard label="Today" value={stats?.scansToday ?? 0} tone="blue" />
            <StatCard label="Checked" value={stats?.checkedScans ?? 0} tone="emerald" />
          </div>

          {stats?.latestScan && (
            <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800/60 dark:bg-slate-900/60">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Latest scan</p>
                <p className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100">{stats.latestScan.tracking}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-slate-900/5 px-3 py-2 text-xs font-medium text-slate-500 dark:bg-slate-100/5 dark:text-slate-300">
                <Clock className="h-4 w-4" />
                <span>{formatRelativeTime(stats.latestScan.timestamp)}</span>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick actions</h2>
            <Link
              to="/scan"
              className="text-sm font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Start scanning
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map(({ to, icon: Icon, title, description, accent, badge }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800/70 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
              >
                <div className="flex gap-4">
                  <span
                    className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700 ${accent}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 transition group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-300">
                        {title}
                      </h3>
                      {badge && (
                        <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-mono text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Keyboard shortcuts</p>
              <p className="text-slate-500 dark:text-slate-400">Navigate faster without leaving the scanner.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-900">S</kbd>
              <span>Scan</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <kbd className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-900">/</kbd>
              <span>Search</span>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

type StatTone = 'default' | 'blue' | 'emerald';

interface StatCardProps {
  label: string;
  value: number;
  tone?: StatTone;
}

function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  const tones: Record<StatTone, { badge: string; value: string }> = {
    default: {
      badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      value: 'text-slate-900 dark:text-slate-100',
    },
    blue: {
      badge: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
      value: 'text-blue-600 dark:text-blue-300',
    },
    emerald: {
      badge: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
      value: 'text-emerald-600 dark:text-emerald-300',
    },
  };

  const palette = tones[tone];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/60">
      <p className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${palette.badge}`}>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold ${palette.value}`}>{value}</p>
    </div>
  );
}