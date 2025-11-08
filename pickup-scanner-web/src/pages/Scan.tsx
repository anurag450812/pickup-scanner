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
  const [isPaused, setIsPaused] = useState(false); // New state for scan pause
  
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
      
      toast.success(`✅ Scanned: ${tracking}`, {
        duration: 2000, // Shorter duration for continuous scanning
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

    let lastScanTime = 0;

    const detectBarcodes = async () => {
      const detector = barcodeDetectorRef.current;
      if (!detector || !isScanning) return;

      try {
        const barcodes = await detector.detect(videoElement);
        console.log('🔍 Detection attempt:', barcodes.length, 'barcodes found');
        if (barcodes.length > 0) {
          const tracking = barcodes[0]?.rawValue;
          const now = Date.now();
          
          console.log('📊 Barcode data:', tracking, 'Time since last:', now - lastScanTime);
          
          if (tracking && now - lastScanTime > 500) { // Prevent rapid duplicate scans
            lastScanTime = now;
            console.log('📱 Barcode detected:', tracking);
            setIsPaused(true); // Show pause indicator
            addScanMutation.mutate(tracking);
            
            // Hide pause indicator after delay
            setTimeout(() => {
              setIsPaused(false);
            }, 500); // 0.5 second pause between scans
          }
        }
      } catch (error) {
        console.log('❌ Detection error:', error);
      }

      // Continue detection loop
      if (isScanning) {
        requestAnimationFrame(detectBarcodes);
      }
    };

    // Start the detection loop
    detectBarcodes();
  };

  // Start ZXing detection
  const startZXingDetection = () => {
    if (!videoRef.current) return;
    
    let lastScanTime = 0;
    
    console.log('🎯 Starting ZXing detection');
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    // Create a wrapper to handle continuous scanning
    const handleResult = (result: any) => {
      console.log('🔍 ZXing detection attempt:', result);
      if (result && isScanning) {
        const tracking = result.getText();
        const now = Date.now();
        
        console.log('📊 ZXing data:', tracking, 'Time since last:', now - lastScanTime);
        
        if (tracking && now - lastScanTime > 500) { // Prevent rapid duplicate scans
          lastScanTime = now;
          console.log('📱 Barcode detected (ZXing):', tracking);
          setIsPaused(true); // Show pause indicator
          addScanMutation.mutate(tracking);
          
          // Hide pause indicator after delay
          setTimeout(() => {
            setIsPaused(false);
          }, 500); // 0.5 second pause between scans
        }
      }
      // Continue scanning - don't stop on errors or after detection
    };
    
    codeReaderRef.current.decodeFromVideoDevice(
      undefined, // Use default camera
      videoRef.current,
      handleResult
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
    <div className="relative flex h-screen w-full flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="relative z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
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

      {/* Main Camera Area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          style={{ minHeight: '300px' }}
        />

        {/* Start Camera Overlay */}
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950">
            <div className="w-full max-w-sm px-6 text-center">
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-900/80 text-blue-400">
                <Camera className="h-10 w-10" />
              </div>
              <button
                onClick={() => {
                  console.log('🖱️ Start camera button clicked');
                  startCamera();
                }}
                className="w-full rounded-2xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-200 hover:bg-blue-500 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/50 active:scale-[0.98] active:bg-blue-700"
                type="button"
              >
                <span className="flex items-center justify-center gap-3">
                  <Camera className="h-6 w-6" />
                  Start Camera
                </span>
              </button>
              <p className="mt-4 text-sm text-slate-400">
                Allow camera access to begin scanning barcodes
              </p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {cameraError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/95 p-6">
            <div className="w-full max-w-md text-center">
              <div className="rounded-3xl border border-rose-500/30 bg-slate-900/80 p-8 backdrop-blur">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
                  <X className="h-8 w-8" />
                </div>
                <h3 className="mb-4 text-xl font-semibold text-white">Camera Error</h3>
                <p className="mb-6 text-sm leading-relaxed text-slate-300">{cameraError}</p>
                <button
                  onClick={() => {
                    console.log('🔄 Try again button clicked');
                    startCamera();
                  }}
                  className="w-full rounded-2xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white transition-all duration-200 hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/50 active:scale-[0.98] active:bg-blue-700"
                  type="button"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scanning UI Overlay */}
        {isScanning && (
          <div className="absolute inset-0 z-10">
            {/* Scanning Frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-64 w-64 rounded-2xl border-2 border-blue-500/50 bg-blue-500/5 backdrop-blur">
                <div className="absolute inset-2 rounded-xl border border-white/20" />
                {/* Corner indicators */}
                <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-blue-400" />
                <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-blue-400" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-blue-400" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-blue-400" />
              </div>
            </div>
            
            {/* Instructions */}
            <div className="absolute left-4 right-4 top-8">
              <div className={`mx-auto max-w-sm rounded-2xl border px-6 py-4 text-center backdrop-blur transition-colors ${
                isPaused 
                  ? 'border-green-400/50 bg-green-500/20 text-green-100' 
                  : 'border-white/10 bg-black/60 text-white'
              }`}>
                {isPaused ? (
                  <>
                    <p className="text-sm font-semibold">✅ Scanned!</p>
                    <p className="mt-1 text-xs text-green-200">Resuming in a moment...</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold">Point camera at barcode</p>
                    <p className="mt-1 text-xs text-slate-300">
                      {isBarcodeDetectorSupported() ? 'Native detection active' : 'ZXing fallback active'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Camera Controls */}
            <div className="absolute bottom-8 left-4 right-4">
              <div className="flex justify-center gap-4">
                <button
                  onClick={toggleFlash}
                  disabled={!hasTorch}
                  className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all ${
                    !hasTorch 
                      ? 'border-slate-600 bg-slate-800/50 text-slate-500' 
                      : flashOn
                      ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30'
                      : 'border-slate-400 bg-slate-800/50 text-slate-300 hover:border-white hover:bg-slate-700/50 hover:text-white'
                  }`}
                  aria-label={flashOn ? 'Turn flashlight off' : 'Turn flashlight on'}
                >
                  {flashOn ? <Flashlight className="h-6 w-6" /> : <FlashlightOff className="h-6 w-6" />}
                </button>
                
                <button
                  onClick={switchCamera}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-400 bg-slate-800/50 text-slate-300 transition-all hover:border-white hover:bg-slate-700/50 hover:text-white"
                  aria-label="Switch camera"
                >
                  <RefreshCw className="h-6 w-6" />
                </button>
                
                <button
                  onClick={stopScanning}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-rose-400 bg-rose-500/20 text-rose-400 transition-all hover:bg-rose-500/30"
                  aria-label="Stop scanning"
                >
                  <X className="h-6 w-6" />
                </button>
                
                <button
                  onClick={() => {
                    stopScanning();
                    setTimeout(startCamera, 100);
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-400 bg-slate-800/50 text-slate-300 transition-all hover:border-white hover:bg-slate-700/50 hover:text-white"
                  aria-label="Restart camera"
                >
                  <RotateCcw className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="relative z-30 bg-slate-950/95 backdrop-blur" style={{ paddingBottom: '6rem' }}>
        {/* Manual Input */}
        {showManualInput && (
          <div className="border-t border-slate-800 p-4">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter tracking number manually"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || addScanMutation.isPending}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {addScanMutation.isPending ? 'Adding...' : 'Add Scan'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}