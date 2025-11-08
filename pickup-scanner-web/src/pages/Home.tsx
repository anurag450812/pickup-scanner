import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ScanLine, 
  List, 
  Search, 
  Download, 
  Settings, 
  Package,
  Clock
} from 'lucide-react';
import { scanOperations } from '../db/dexie';
import { formatRelativeTime } from '../lib/normalize';

export default function Home() {
  // Get recent stats
  const { data: stats } = useQuery({
    queryKey: ['homeStats'],
    queryFn: async () => {
      const [totalScans, latestScan, recentScans] = await Promise.all([
        scanOperations.getScansCount(),
        scanOperations.getLatestScan(),
        scanOperations.getAllScans()
      ]);
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const scansToday = recentScans.filter(scan => scan.timestamp >= startOfDay).length;
      const checkedScans = recentScans.filter(scan => scan.checked).length;
      
      return {
        totalScans,
        scansToday,
        checkedScans,
        latestScan
      };
    }
  });

  const menuItems = [
    {
      to: '/scan',
      icon: ScanLine,
      title: 'Scan New',
      description: 'Scan or add tracking numbers',
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      shortcut: 'S'
    },
    {
      to: '/list',
      icon: List,
      title: 'List Scans',
      description: 'View all scanned items',
      gradient: 'from-green-500 via-green-600 to-emerald-600',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      to: '/search',
      icon: Search,
      title: 'Search / Verify',
      description: 'Find and verify parcels',
      gradient: 'from-purple-500 via-purple-600 to-violet-600',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      shortcut: '/'
    },
    {
      to: '/import-export',
      icon: Download,
      title: 'Import/Export',
      description: 'Backup and restore data',
      gradient: 'from-orange-500 via-orange-600 to-amber-600',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400'
    },
    {
      to: '/settings',
      icon: Settings,
      title: 'Settings',
      description: 'App preferences',
      gradient: 'from-gray-500 via-gray-600 to-slate-600',
      iconBg: 'bg-gray-100 dark:bg-gray-900/30',
      iconColor: 'text-gray-600 dark:text-gray-400'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header with modern gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative text-white p-6 pb-8">
          <div className="flex items-center gap-3 mb-6 animate-fade-in">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Pickup Scanner</h1>
              <p className="text-sm text-white/80">Modern parcel tracking</p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 animate-slide-up">
              <div className="text-3xl font-bold">{stats?.totalScans || 0}</div>
              <div className="text-xs text-white/80 mt-1">Total</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-3xl font-bold">{stats?.scansToday || 0}</div>
              <div className="text-xs text-white/80 mt-1">Today</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-3xl font-bold">{stats?.checkedScans || 0}</div>
              <div className="text-xs text-white/80 mt-1">Checked</div>
            </div>
          </div>
          
          {/* Latest scan card */}
          {stats?.latestScan && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Clock className="w-4 h-4" />
                <span>Latest Scan</span>
              </div>
              <div className="font-mono text-sm">{stats.latestScan.tracking}</div>
              <div className="text-xs text-white/70 mt-1">
                {formatRelativeTime(stats.latestScan.timestamp)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Items with modern cards */}
      <div className="flex-1 p-6 space-y-3">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="block group animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-soft hover:shadow-soft-lg transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 group-active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className={`${item.iconBg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {item.title}
                      </h3>
                      {item.shortcut && (
                        <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md">
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer with keyboard shortcuts */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <span>Shortcuts:</span>
            <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-gray-700 dark:text-gray-300 shadow-sm">S</kbd>
            <span>Scan</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-gray-700 dark:text-gray-300 shadow-sm">/</kbd>
            <span>Search</span>
          </p>
        </div>
      </div>
    </div>
  );
}