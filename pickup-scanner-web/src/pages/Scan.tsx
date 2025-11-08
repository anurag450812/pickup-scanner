import { useState, useRef, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Camera, 
  FlashlightOff, 
  Flashlight, 
  Keyboard, 
  RotateCcw,
  RefreshCw,
  X
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { scanOperations } from '../db/dexie';
import { normalizeTracking, vibrate, playBeep, isBarcodeDetectorSupported, requestCameraPermission } from '../lib/normalize';

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export default function Scan() {
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [lastScanId, setLastScanId] = useState<number | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const restartTimeoutRef = useRef<number | null>(null);
  const lastAttemptedTrackingRef = useRef<string | null>(null);
  const torchWarnedRef = useRef<boolean>(false);
  
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  
  const queryClient = useQueryClient();

  // Get device name from localStorage
  const getDeviceName = () => localStorage.getItem('deviceName') || 'Unknown Device';

  // Add scan mutation
  const addScanMutation = useMutation({
    mutationFn: async (tracking: string) => {
      const normalized = normalizeTracking(tracking);
      lastAttemptedTrackingRef.current = normalized;

      // Check for duplicate today
      const duplicate = await scanOperations.checkDuplicateToday(normalized);
      if (duplicate) {
        throw new Error('DUPLICATE');
      }

      const scanId = await scanOperations.addScan({
        tracking: normalized,
        timestamp: Date.now(),
        deviceName: getDeviceName(),
        checked: false
      });

      return { scanId, tracking: normalized };
    },
    onSuccess: ({ scanId, tracking }) => {
      setLastScanId(scanId);
      queryClient.invalidateQueries({ queryKey: ['homeStats'] });
      
      // Feedback based on preferences
      const beepPref = localStorage.getItem('beepOnScan') !== 'false';
      const vibratePref = localStorage.getItem('vibrateOnScan') !== 'false';
      if (vibratePref) vibrate(100);
      if (beepPref) playBeep();
      
      toast.success(`Saved: ${tracking}`, {
        action: {
          label: 'Undo',
          onClick: () => undoLastScan()
        }
      });
    },
    onError: (error: Error) => {
      if (error.message === 'DUPLICATE') {
        toast.warning('Duplicate scan for today', {
          action: {
            label: 'Add anyway',
            onClick: () => addDuplicateScan()
          }
        });
      } else {
        toast.error('Failed to save scan');
      }
    }
  });

  // Undo last scan
  const undoLastScan = async () => {
    if (lastScanId) {
      try {
        await scanOperations.deleteScans([lastScanId]);
        setLastScanId(null);
        queryClient.invalidateQueries({ queryKey: ['homeStats'] });
        toast.success('Scan undone');
      } catch {
        toast.error('Failed to undo scan');
      }
    }
  };

  // Add duplicate scan
  const addDuplicateScan = async () => {
    const tracking = lastAttemptedTrackingRef.current || manualInput || '';
    if (tracking.trim()) {
      try {
        const normalized = normalizeTracking(tracking);
        const scanId = await scanOperations.addScan({
          tracking: normalized,
          timestamp: Date.now(),
          deviceName: getDeviceName(),
          checked: false
        });

        setLastScanId(scanId);
        queryClient.invalidateQueries({ queryKey: ['homeStats'] });
        toast.success(`Saved: ${normalized}`);
      } catch {
        toast.error('Failed to save scan');
      }
    }
  };

  // Initialize barcode detector
  const initBarcodeDetector = useCallback(() => {
    if (isBarcodeDetectorSupported() && window.BarcodeDetector) {
      barcodeDetectorRef.current = new window.BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
      });
      return true;
    }
    barcodeDetectorRef.current = null;
    return false;
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      console.log('🎥 Starting camera...');
      setCameraError(null);
      
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ MediaDevices API not supported');
        setCameraError('Camera API not supported in this browser.');
        return;
      }

      // Check if we're on HTTPS or localhost
      const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
      if (!isSecureContext) {
        console.error('❌ Camera requires HTTPS');
        setCameraError('Camera access requires HTTPS. Please use a secure connection.');
        return;
      }
      
      // Request camera permission first
      console.log('🔐 Requesting camera permission...');
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        console.error('❌ Camera permission denied');
        setCameraError('Camera permission denied. Please enable camera access in your browser settings.');
        return;
      }
      console.log('✅ Camera permission granted');

      const videoConstraints: MediaTrackConstraints = selectedCameraId
        ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } };

      console.log('📹 Getting user media with constraints:', videoConstraints);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints
      });
      console.log('✅ Media stream obtained:', stream.getVideoTracks().length, 'video tracks');

      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log('🎬 Setting video source and playing...');
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
        console.log('✅ Video playing successfully');

        // Torch support detection
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
          setHasTorch(Boolean(capabilities?.torch));
          console.log('💡 Torch support:', Boolean(capabilities?.torch));
        } else {
          setHasTorch(false);
          console.log('⚠️ No video track found for torch detection');
        }
        
        // Try BarcodeDetector first, fallback to ZXing
        console.log('🔍 Initializing barcode detection...');
        if (initBarcodeDetector()) {
          console.log('✅ Using native BarcodeDetector');
          startBarcodeDetection();
        } else {
          console.log('📚 Using ZXing fallback');
          startZXingDetection();
        }
      } else {
        console.error('❌ Video element not found');
        setCameraError('Video element not ready. Please try again.');
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setCameraError('Camera permission denied. Please allow camera access and try again.');
        } else if (error.name === 'NotFoundError') {
          setCameraError('No camera found. Please connect a camera and try again.');
        } else if (error.name === 'NotReadableError') {
          setCameraError('Camera is busy or unavailable. Please close other apps using the camera.');
        } else if (error.name === 'OverconstrainedError') {
          setCameraError('Camera constraints not supported. Trying with basic settings...');
          // Retry with simpler constraints
          try {
            const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = simpleStream;
            if (videoRef.current) {
              videoRef.current.srcObject = simpleStream;
              await videoRef.current.play();
              setIsScanning(true);
              setCameraError(null);
            }
          } catch (retryError) {
            console.error('❌ Retry failed:', retryError);
            setCameraError('Failed to access camera with any settings.');
          }
        } else {
          setCameraError(`Camera error: ${error.message}`);
        }
      } else {
        setCameraError('Failed to access camera. Please check permissions and try again.');
      }
    }
  };

  // Start barcode detection with native API
  const startBarcodeDetection = () => {
    const videoElement = videoRef.current;
    if (!barcodeDetectorRef.current || !videoElement) return;

    const detectBarcodes = async () => {
      const detector = barcodeDetectorRef.current;
      if (!detector) return;

      try {
        const barcodes = await detector.detect(videoElement);
        if (barcodes.length > 0) {
          const tracking = barcodes[0]?.rawValue;
          if (tracking) {
            addScanMutation.mutate(tracking);
            stopScanning();
            if (restartTimeoutRef.current) {
              window.clearTimeout(restartTimeoutRef.current);
            }
            restartTimeoutRef.current = window.setTimeout(() => {
              if (isScanning) {
                startCamera();
              }
            }, 1000);
          }
        }
      } catch {
        // Ignore detection errors, they're common
      }
    };

    scanIntervalRef.current = window.setInterval(detectBarcodes, 100);
  };

  // Start ZXing detection
  const startZXingDetection = () => {
    if (!videoRef.current) return;
    
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    codeReaderRef.current.decodeFromVideoDevice(
      undefined, // Use default camera
      videoRef.current,
      (result) => {
        if (result) {
          const tracking = result.getText();
          if (tracking) {
            addScanMutation.mutate(tracking);
            stopScanning();
            if (restartTimeoutRef.current) {
              window.clearTimeout(restartTimeoutRef.current);
            }
            restartTimeoutRef.current = window.setTimeout(() => {
              if (isScanning) {
                startCamera();
              }
            }, 1000);
          }
        }
        // Ignore errors, they're common during scanning
      }
    );
  };

  // Stop scanning
  const stopScanning = useCallback(() => {
    setIsScanning(false);

    if (restartTimeoutRef.current) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (codeReaderRef.current) {
      const reader = codeReaderRef.current as BrowserMultiFormatReader & { reset?: () => void };
      try {
        reader.reset?.();
      } catch {
        // Ignore reset errors
      }
      codeReaderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Toggle flashlight
  const toggleFlash = async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const capabilities = track.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;

    if (capabilities?.torch) {
      try {
        const torchConstraint: MediaTrackConstraints = {
          advanced: [{ torch: !flashOn } as MediaTrackConstraintSet & { torch?: boolean }]
        };
        await track.applyConstraints(torchConstraint);
        setFlashOn(!flashOn);
      } catch {
        toast.error('Flashlight not available');
      }
    } else if (!torchWarnedRef.current) {
      toast.error('Flashlight not supported on this camera');
      torchWarnedRef.current = true;
    }
  };

  // Load available cameras
  const loadCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((device) => device.kind === 'videoinput');
      setAvailableCameras(videos);
      if (!selectedCameraId && videos.length > 0) {
        const preferred = videos.find((device) => /back|environment/i.test(device.label));
        setSelectedCameraId(preferred?.deviceId ?? videos[0].deviceId);
      }
    } catch {
      // Ignore enumerate failures
    }
  }, [selectedCameraId]);

  // Switch camera
  const switchCamera = async () => {
    if (availableCameras.length < 2) {
      toast.message('Only one camera detected');
      return;
    }
    const currentIndex = availableCameras.findIndex(d => d.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextId = availableCameras[nextIndex].deviceId;
    setSelectedCameraId(nextId);
    // Restart camera with new device
    stopScanning();
    setTimeout(startCamera, 100);
  };

  // Handle manual input
  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (manualInput.trim()) {
      addScanMutation.mutate(manualInput.trim());
      setManualInput('');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    void loadCameras();
    return () => {
      stopScanning();
    };
  }, [loadCameras, stopScanning]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 pb-28 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-sm font-semibold text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <h1 className="text-base font-semibold">Scan parcels</h1>
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 transition ${
            showManualInput ? 'bg-blue-600 text-white' : 'text-slate-300 hover:border-slate-600 hover:text-white'
          }`}
          aria-label="Toggle manual input"
        >
          <Keyboard className="h-5 w-5" />
        </button>
      </header>

      {/* Camera View */}
      <div className="flex-1 relative">
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-blue-400">
                <Camera className="h-8 w-8" />
              </div>
              <button
                onClick={startCamera}
                className="mx-auto inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <Camera className="h-5 w-5" />
                Start camera
              </button>
              <p className="mt-3 text-xs text-slate-400">Allow camera access to begin scanning barcodes.</p>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 p-6 text-center">
            <div className="max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900/70 p-6">
              <X className="mx-auto h-10 w-10 text-rose-400" />
              <h3 className="mt-4 text-lg font-semibold">Camera error</h3>
              <p className="mt-2 text-sm text-slate-400">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scanning frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-64 w-64 rounded-xl border border-blue-500/30">
                <div className="absolute inset-0 rounded-xl border border-white/10" />
              </div>
            </div>
            
            {/* Instructions */}
            <div className="absolute top-4 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-1.5 text-center text-xs text-slate-200 backdrop-blur">
              <p className="font-medium">Point the camera at a barcode</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                {isBarcodeDetectorSupported() ? 'Using native detection' : 'Using ZXing fallback'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls - sticky action bar */}
  <div className="sticky bottom-24 border-t border-slate-800 bg-slate-950 px-4 py-4">
        {isScanning && (
          <>
          <div className="mb-3 flex justify-center gap-3">
            <button
              onClick={toggleFlash}
              aria-label={flashOn ? 'Turn flashlight off' : 'Turn flashlight on'}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 transition ${
                !hasTorch ? 'opacity-40' : 'hover:border-blue-500 hover:text-blue-300'
              }`}
              disabled={!hasTorch}
            >
              {flashOn ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
            </button>
            <button
              onClick={switchCamera}
              aria-label="Switch camera"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 transition hover:border-blue-500 hover:text-blue-300"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={stopScanning}
              aria-label="Stop scanning"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              Stop
            </button>
            <button
              onClick={() => {
                stopScanning();
                setTimeout(startCamera, 100);
              }}
              aria-label="Restart camera"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 transition hover:border-blue-500 hover:text-blue-300"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
          {availableCameras.length > 1 && (
            <div className="text-center text-xs text-slate-500">
              Camera: {availableCameras.find(d => d.deviceId === selectedCameraId)?.label || 'Default'}
            </div>
          )}
          </>
        )}

        {/* Manual Input */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter tracking number manually"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || addScanMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                Add
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}