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
        {/* Stats Section */}
        <section className="border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Latest scan</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100">{stats.latestScan.tracking}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span>{formatRelativeTime(stats.latestScan.timestamp)}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick actions</h2>
            <Link
              to="/scan"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Start scanning →
            </Link>
          </div>
          <div className="space-y-2">
            {quickActions.map(({ to, icon: Icon, title, description, badge }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-4 border border-slate-200 bg-white p-4 hover:border-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-400"
              >
                <Icon className="h-6 w-6 flex-shrink-0 text-slate-400 group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-blue-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {title}
                    </h3>
                    {badge && (
                      <span className="border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-mono text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Keyboard shortcuts</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Navigate faster</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <kbd className="border border-slate-200 bg-slate-50 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-800">S</kbd>
              <span>Scan</span>
              <kbd className="border border-slate-200 bg-slate-50 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-800">/</kbd>
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