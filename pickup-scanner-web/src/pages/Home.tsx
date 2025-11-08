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
      color: 'bg-blue-500 hover:bg-blue-600',
      shortcut: 'S'
    },
    {
      to: '/list',
      icon: List,
      title: 'List Scans',
      description: 'View all scanned items',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      to: '/search',
      icon: Search,
      title: 'Search / Verify',
      description: 'Find and verify parcels',
      color: 'bg-purple-500 hover:bg-purple-600',
      shortcut: '/'
    },
    {
      to: '/import-export',
      icon: Download,
      title: 'Import/Export',
      description: 'Backup and restore data',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      to: '/settings',
      icon: Settings,
      title: 'Settings',
      description: 'App preferences',
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Pickup Scanner</h1>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats?.totalScans || 0}</div>
            <div className="text-sm opacity-90">Total Scans</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats?.scansToday || 0}</div>
            <div className="text-sm opacity-90">Today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats?.checkedScans || 0}</div>
            <div className="text-sm opacity-90">Checked</div>
          </div>
        </div>
        
        {/* Latest scan */}
        {stats?.latestScan && (
          <div className="bg-white/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>Latest: {stats.latestScan.tracking}</span>
            </div>
            <div className="text-xs opacity-75 mt-1">
              {formatRelativeTime(stats.latestScan.timestamp)}
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="flex-1 p-6">
        <div className="grid gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`${item.color} text-white rounded-xl p-6 block transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg`}
              >
                <div className="flex items-start gap-4">
                  <Icon className="w-8 h-8 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">{item.title}</h3>
                      {item.shortcut && (
                        <span className="bg-white/20 px-2 py-1 rounded text-xs font-mono">
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                    <p className="text-white/80 mt-1">{item.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="p-4 bg-gray-100 dark:bg-gray-700">
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Keyboard shortcuts: <kbd className="bg-gray-200 dark:bg-gray-600 px-1 rounded">S</kbd> to scan, <kbd className="bg-gray-200 dark:bg-gray-600 px-1 rounded">/</kbd> to search</p>
        </div>
      </div>
    </div>
  );
}