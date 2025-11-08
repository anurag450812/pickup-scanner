import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ScanLine,
  List,
  Search,
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
    badge: 'S',
  },
  {
    to: '/list',
    icon: List,
    title: 'View list',
    description: 'Group, review, and manage scans',
  },
  {
    to: '/search',
    icon: Search,
    title: 'Search & verify',
    description: 'Find matches and confirm parcels',
    badge: '/',
  },
  // Removed import/export and preferences per request
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
      <div className="space-y-8 pb-6">
        {/* Stats Section */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-600 text-white">
              <Package className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Today&apos;s Snapshot
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Real-time scanning activity</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total" value={stats?.totalScans ?? 0} tone="default" />
            <StatCard label="Today" value={stats?.scansToday ?? 0} tone="blue" />
            <StatCard label="Checked" value={stats?.checkedScans ?? 0} tone="emerald" />
          </div>

          {stats?.latestScan && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="mb-2 inline-flex rounded-sm bg-blue-600 px-2 py-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white">Latest Scan</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">{stats.latestScan.tracking}</p>
                <div className="flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Clock className="h-4 w-4" />
                  <span>{formatRelativeTime(stats.latestScan.timestamp)}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Quick Actions Header */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Quick Actions
          </h2>
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <span>Start now</span>
            <span>→</span>
          </Link>
        </div>

        {/* Quick Actions Cards */}
        <section className="space-y-3">
          {quickActions.map(({ to, icon: Icon, title, description, badge }) => (
            <Link key={to} to={to} className="block">
              <div className="rounded-xl border border-slate-200 bg-white transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70">
                <div className="flex items-center gap-4 p-4">
                  {/* Icon Container */}
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Icon className="h-6 w-6" strokeWidth={2.2} />
                  </div>

                  {/* Content Container */}
                  <div className="flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {title}
                      </h3>
                      {badge && (
                        <span className="rounded-sm border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300">
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{description}</p>
                  </div>

                  {/* Arrow */}
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Keyboard Shortcuts */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Keyboard Shortcuts</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="mb-2 text-center">
                <kbd className="inline-block rounded-sm border border-slate-300 bg-white px-4 py-2 font-mono text-2xl font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">S</kbd>
              </div>
              <p className="text-center text-xs font-semibold text-slate-700 dark:text-slate-300">Scan</p>
              <p className="text-center text-[11px] font-medium text-slate-500">Quick scanner</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="mb-2 text-center">
                <kbd className="inline-block rounded-sm border border-slate-300 bg-white px-4 py-2 font-mono text-2xl font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">/</kbd>
              </div>
              <p className="text-center text-xs font-semibold text-slate-700 dark:text-slate-300">Search</p>
              <p className="text-center text-[11px] font-medium text-slate-500">Find parcels</p>
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
  const tones: Record<StatTone, { border: string; badge: string; value: string }> = {
    default: {
      border: 'border-slate-200 dark:border-slate-700',
      badge: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
      value: 'text-slate-900 dark:text-slate-100',
    },
    blue: {
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-600 text-white',
      value: 'text-blue-700 dark:text-blue-300',
    },
    emerald: {
      border: 'border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-600 text-white',
      value: 'text-emerald-700 dark:text-emerald-300',
    },
  };

  const palette = tones[tone];

  return (
    <div className={`rounded-lg border ${palette.border} bg-white p-5 dark:bg-slate-900`}>
      <div className={`mb-2 inline-flex rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${palette.badge}`}>
        {label}
      </div>
      <p className={`text-4xl font-bold ${palette.value}`}>{value}</p>
    </div>
  );
}