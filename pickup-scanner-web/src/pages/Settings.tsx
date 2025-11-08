import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Smartphone, 
  Volume2, 
  Vibrate, 
  Database,
  Trash2,
  AlertTriangle,
  Info,
  Check,
  X
} from 'lucide-react';
import { dbUtils } from '../db/dexie';
import { isCameraSupported, isBarcodeDetectorSupported, vibrate, playBeep } from '../lib/normalize';

interface SettingsProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
}

export default function Settings({ isDarkMode, setIsDarkMode }: SettingsProps) {
  const [deviceName, setDeviceName] = useState('');
  const [beepOnScan, setBeepOnScan] = useState(true);
  const [vibrateOnScan, setVibrateOnScan] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedDeviceName = localStorage.getItem('deviceName') || '';
    const savedBeepOnScan = localStorage.getItem('beepOnScan') !== 'false';
    const savedVibrateOnScan = localStorage.getItem('vibrateOnScan') !== 'false';

    setDeviceName(savedDeviceName);
    setBeepOnScan(savedBeepOnScan);
    setVibrateOnScan(savedVibrateOnScan);
  }, []);

  // Get database stats
  const { data: dbStats } = useQuery({
    queryKey: ['databaseStats'],
    queryFn: dbUtils.getDatabaseSize,
    refetchInterval: 5000 // Update every 5 seconds
  });

  // Get device capabilities
  const { data: deviceInfo } = useQuery({
    queryKey: ['deviceInfo'],
    queryFn: async () => {
      const [hasCamera, hasBarcodeDetector] = await Promise.all([
        isCameraSupported(),
        Promise.resolve(isBarcodeDetectorSupported())
      ]);
      return {
        hasCamera,
        hasBarcodeDetector,
        hasVibration: 'vibrate' in navigator,
        hasWebAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
        userAgent: navigator.userAgent,
        isOnline: navigator.onLine,
        isPWA: window.matchMedia('(display-mode: standalone)').matches
      };
    }
  });

  // Clear database mutation
  const clearDatabaseMutation = useMutation({
    mutationFn: dbUtils.clearDatabase,
    onSuccess: () => {
      setShowDeleteConfirm(false);
      toast.success('Database cleared successfully');
    },
    onError: () => {
      toast.error('Failed to clear database');
    }
  });

  // Save device name
  const saveDeviceName = (name: string) => {
    localStorage.setItem('deviceName', name.trim());
    setDeviceName(name.trim());
    toast.success('Device name saved');
  };

  // Save preference
  const savePreference = (key: string, value: boolean) => {
    localStorage.setItem(key, value.toString());
    switch (key) {
      case 'beepOnScan':
        setBeepOnScan(value);
        if (value) playBeep();
        break;
      case 'vibrateOnScan':
        setVibrateOnScan(value);
        if (value) vibrate(100);
        break;
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Generate default device name
  const generateDeviceName = () => {
    const userAgent = navigator.userAgent;
    let deviceType = 'Unknown Device';
    
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      deviceType = 'iOS Device';
    } else if (/Android/.test(userAgent)) {
      deviceType = 'Android Device';
    } else if (/Windows/.test(userAgent)) {
      deviceType = 'Windows Device';
    } else if (/Mac/.test(userAgent)) {
      deviceType = 'Mac Device';
    }
    
    const randomId = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${deviceType} ${randomId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header with modern styling */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10 shadow-soft">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-300 dark:to-gray-100 bg-clip-text text-transparent">
            Settings
          </h1>
          <div className="w-12" /> {/* Spacer for centered title */}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Appearance */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            {isDarkMode ? <Moon className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <Sun className="w-6 h-6 text-orange-500" />}
            Appearance
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">Dark Mode</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Use dark theme for better low-light viewing
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ${
                  isDarkMode ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                } shadow-inner`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-lg ${
                    isDarkMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Device Settings */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Device Settings
          </h2>
          
          <div className="space-y-4">
            {/* Device Name */}
            <div>
              <label className="block font-semibold mb-2 text-gray-900 dark:text-gray-100">Device Name</label>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                This name will be saved with each scan for identification
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Enter device name"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                />
                <button
                  onClick={() => saveDeviceName(deviceName)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Save
                </button>
              </div>
              {!deviceName.trim() && (
                <button
                  onClick={() => {
                    const name = generateDeviceName();
                    setDeviceName(name);
                    saveDeviceName(name);
                  }}
                  className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline transition-colors"
                >
                  ✨ Generate automatic name
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Scan Preferences */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Volume2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Scan Feedback
          </h2>
          
          <div className="space-y-3">
            {/* Beep on scan */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Beep on Scan</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Play sound when barcode is detected
                  </div>
                </div>
              </div>
              <button
                onClick={() => savePreference('beepOnScan', !beepOnScan)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ${
                  beepOnScan ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-300 dark:bg-gray-600'
                } shadow-inner`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-lg ${
                    beepOnScan ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Vibrate on scan */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Vibrate className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">Vibrate on Scan</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Vibrate when barcode is detected
                    {!deviceInfo?.hasVibration && <span className="text-orange-500"> (Not supported)</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => savePreference('vibrateOnScan', !vibrateOnScan)}
                disabled={!deviceInfo?.hasVibration}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ${
                  vibrateOnScan && deviceInfo?.hasVibration ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                } ${!deviceInfo?.hasVibration ? 'opacity-50 cursor-not-allowed' : ''} shadow-inner`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-lg ${
                    vibrateOnScan && deviceInfo?.hasVibration ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Database Management */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database
          </h2>
          
          <div className="space-y-4">
            {/* Storage usage */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium mb-2">Storage Usage</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Scans</div>
                  <div className="font-mono font-bold">{dbStats?.scans || 0}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Logs</div>
                  <div className="font-mono font-bold">{dbStats?.logs || 0}</div>
                </div>
              </div>
            </div>

            {/* Clear database */}
            <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-800 dark:text-red-200 mb-1">
                    Clear All Data
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                    This will permanently delete all scanned data and cannot be undone. 
                    Consider exporting your data first.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear Database
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Are you sure? This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => clearDatabaseMutation.mutate()}
                          disabled={clearDatabaseMutation.isPending}
                          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                        >
                          {clearDatabaseMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Clearing...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Yes, Delete All
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={clearDatabaseMutation.isPending}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Device Info */}
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Device Information
          </h2>
          
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Camera Support</div>
                <div className={`font-medium ${deviceInfo?.hasCamera ? 'text-green-600' : 'text-red-600'}`}>
                  {deviceInfo?.hasCamera ? 'Available' : 'Not Available'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Barcode API</div>
                <div className={`font-medium ${deviceInfo?.hasBarcodeDetector ? 'text-green-600' : 'text-orange-600'}`}>
                  {deviceInfo?.hasBarcodeDetector ? 'Native' : 'Fallback (ZXing)'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Vibration</div>
                <div className={`font-medium ${deviceInfo?.hasVibration ? 'text-green-600' : 'text-red-600'}`}>
                  {deviceInfo?.hasVibration ? 'Supported' : 'Not Supported'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Audio</div>
                <div className={`font-medium ${deviceInfo?.hasWebAudio ? 'text-green-600' : 'text-red-600'}`}>
                  {deviceInfo?.hasWebAudio ? 'Supported' : 'Not Supported'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Connection</div>
                <div className={`font-medium ${deviceInfo?.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {deviceInfo?.isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">PWA Mode</div>
                <div className={`font-medium ${deviceInfo?.isPWA ? 'text-green-600' : 'text-orange-600'}`}>
                  {deviceInfo?.isPWA ? 'Installed' : 'Browser'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* App Info */}
        <section className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
          <h3 className="font-semibold mb-2">Pickup Scanner PWA</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Version 1.0.0 • Built with React + Vite + Dexie
          </p>
        </section>
      </div>
    </div>
  );
}