import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
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
  X,
} from 'lucide-react';
import { dbUtils } from '../db/dexie';
import { isCameraSupported, isBarcodeDetectorSupported, vibrate, playBeep } from '../lib/normalize';
import { PageLayout } from '../components/PageLayout';

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
    <PageLayout title="Settings" subtitle="Tailor the scanning experience" backTo="/">
      <div className="space-y-6 pb-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isDarkMode ? <Moon className="h-5 w-5 text-blue-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
            Appearance
          </h2>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Dark theme</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Ideal for low light and AMOLED displays.</p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                  isDarkMode ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                    isDarkMode ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Smartphone className="h-5 w-5 text-blue-500" /> Device
          </h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Device name</label>
              <p className="text-xs text-slate-500 dark:text-slate-400">Stored with each scan to identify the source.</p>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="e.g. Front Desk iPad"
                />
                <button
                  onClick={() => saveDeviceName(deviceName)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
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
                  className="mt-2 text-sm font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-300"
                >
                  Generate a friendly name
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Volume2 className="h-5 w-5 text-blue-500" /> Scan feedback
          </h2>
          <div className="mt-5 space-y-3">
            <PreferenceToggle
              title="Beep when a barcode is captured"
              description="Audio confirmation helps in busy environments."
              icon={<Volume2 className="h-5 w-5 text-blue-500" />}
              enabled={beepOnScan}
              onToggle={() => savePreference('beepOnScan', !beepOnScan)}
            />
            <PreferenceToggle
              title="Vibrate on scan"
              description={
                deviceInfo?.hasVibration
                  ? 'Useful when sound is muted or noisy.'
                  : 'Vibration is not available on this device.'
              }
              icon={<Vibrate className="h-5 w-5 text-purple-500" />}
              enabled={vibrateOnScan && !!deviceInfo?.hasVibration}
              onToggle={() => savePreference('vibrateOnScan', !vibrateOnScan)}
              disabled={!deviceInfo?.hasVibration}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Database className="h-5 w-5 text-slate-500" /> Storage
          </h2>
          <div className="mt-5 space-y-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usage</h3>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Scans</p>
                  <p className="font-mono text-lg font-semibold text-slate-800 dark:text-slate-100">{dbStats?.scans ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Logs</p>
                  <p className="font-mono text-lg font-semibold text-slate-800 dark:text-slate-100">{dbStats?.logs ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5" />
                <div className="flex-1">
                  <p className="font-semibold">Clear all local data</p>
                  <p className="mt-1">Deletes every scan stored on this device. Export first if you want a backup.</p>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
                    >
                      <Trash2 className="h-4 w-4" /> Clear database
                    </button>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-rose-500 dark:text-rose-200">This cannot be undone.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => clearDatabaseMutation.mutate()}
                          disabled={clearDatabaseMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-300"
                        >
                          {clearDatabaseMutation.isPending ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={clearDatabaseMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300"
                        >
                          <X className="h-4 w-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Info className="h-5 w-5 text-slate-500" /> Device information
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
            <InfoRow label="Camera" value={deviceInfo?.hasCamera ? 'Available' : 'Unavailable'} tone={deviceInfo?.hasCamera ? 'positive' : 'negative'} />
            <InfoRow label="Barcode API" value={deviceInfo?.hasBarcodeDetector ? 'Native' : 'Fallback'} tone={deviceInfo?.hasBarcodeDetector ? 'positive' : 'warning'} />
            <InfoRow label="Vibration" value={deviceInfo?.hasVibration ? 'Supported' : 'Not supported'} tone={deviceInfo?.hasVibration ? 'positive' : 'negative'} />
            <InfoRow label="Audio" value={deviceInfo?.hasWebAudio ? 'Supported' : 'Not supported'} tone={deviceInfo?.hasWebAudio ? 'positive' : 'negative'} />
            <InfoRow label="Connection" value={deviceInfo?.isOnline ? 'Online' : 'Offline'} tone={deviceInfo?.isOnline ? 'positive' : 'negative'} />
            <InfoRow label="Install mode" value={deviceInfo?.isPWA ? 'PWA' : 'Browser'} tone={deviceInfo?.isPWA ? 'positive' : 'warning'} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Pickup Scanner PWA</p>
          <p className="mt-1">Version 1.0.0 · React · Vite · Dexie</p>
        </section>
      </div>
    </PageLayout>
  );
}

interface PreferenceToggleProps {
  title: string;
  description: string;
  icon: ReactNode;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function PreferenceToggle({ title, description, icon, enabled, onToggle, disabled }: PreferenceToggleProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </span>
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
          enabled ? 'bg-blue-600' : 'bg-slate-300'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        aria-label={`Toggle ${title}`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
            enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

type InfoTone = 'positive' | 'negative' | 'warning';

function InfoRow({ label, value, tone }: { label: string; value: string | undefined; tone: InfoTone }) {
  const toneClasses: Record<InfoTone, string> = {
    positive: 'text-emerald-600 dark:text-emerald-300',
    negative: 'text-rose-600 dark:text-rose-300',
    warning: 'text-amber-600 dark:text-amber-300',
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${toneClasses[tone]}`}>{value ?? 'Unknown'}</p>
    </div>
  );
}