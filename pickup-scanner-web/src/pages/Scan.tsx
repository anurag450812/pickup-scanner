import { useState, useRef, useEffect } from 'react';
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
  const barcodeDetectorRef = useRef<any>(null);
  const scanIntervalRef = useRef<number | null>(null);
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
      } catch (error) {
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
      } catch (error) {
        toast.error('Failed to save scan');
      }
    }
  };

  // Initialize barcode detector
  const initBarcodeDetector = () => {
    if (isBarcodeDetectorSupported()) {
      barcodeDetectorRef.current = new (window as any).BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
      });
      return true;
    }
    return false;
  };

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      
      // Request camera permission first
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setCameraError('Camera permission denied. Please enable camera access.');
        return;
      }

      const videoConstraints: MediaTrackConstraints = selectedCameraId
        ? { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);

        // Torch support detection
        const track = stream.getVideoTracks()[0];
        const caps: any = track.getCapabilities?.() || {};
        const torchCap = !!caps.torch;
        setHasTorch(torchCap);
        
        // Try BarcodeDetector first, fallback to ZXing
        if (initBarcodeDetector()) {
          startBarcodeDetection();
        } else {
          startZXingDetection();
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Failed to access camera. Please check permissions.');
    }
  };

  // Start barcode detection with native API
  const startBarcodeDetection = () => {
    if (!barcodeDetectorRef.current || !videoRef.current) return;
    
    const detectBarcodes = async () => {
      try {
        const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const tracking = barcodes[0].rawValue;
          if (tracking) {
            addScanMutation.mutate(tracking);
            // Brief pause to prevent multiple scans
            stopScanning();
            setTimeout(() => {
              if (isScanning) startCamera();
            }, 1000);
          }
        }
      } catch (error) {
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
            // Brief pause to prevent multiple scans
            stopScanning();
            setTimeout(() => {
              if (isScanning) startCamera();
            }, 1000);
          }
        }
        // Ignore errors, they're common during scanning
      }
    );
  };

  // Stop scanning
  const stopScanning = () => {
    setIsScanning(false);
    
    // Clear intervals
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Stop ZXing
    if (codeReaderRef.current) {
      try {
        // Try to stop the reader
        (codeReaderRef.current as any).reset?.();
      } catch (error) {
        // Ignore reset errors
      }
      codeReaderRef.current = null;
    }
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Toggle flashlight
  const toggleFlash = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && 'torch' in track.getCapabilities()) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashOn } as any]
          });
          setFlashOn(!flashOn);
        } catch (error) {
          toast.error('Flashlight not available');
        }
      } else {
        if (!torchWarnedRef.current) {
          toast.error('Flashlight not supported on this camera');
          torchWarnedRef.current = true;
        }
      }
    }
  };

  // Load available cameras
  const loadCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(videos);
      // If we don't have a selected camera yet, pick the back one if possible
      if (!selectedCameraId && videos.length > 0) {
        // Heuristic: prefer device label containing 'back' or 'environment'
        const preferred = videos.find(d => /back|environment/i.test(d.label));
        setSelectedCameraId(preferred?.deviceId || videos[0].deviceId);
      }
    } catch (e) {
      // Ignore
    }
  };

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
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      addScanMutation.mutate(manualInput.trim());
      setManualInput('');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    // Load cameras early
    loadCameras();
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header with modern styling */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white border-b border-gray-700 shadow-lg">
        <Link to="/" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold">Scan Tracking</h1>
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className={`p-2 rounded-lg transition-colors ${showManualInput ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
          aria-label="Toggle manual input"
        >
          <Keyboard className="w-5 h-5" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
            <div className="text-center">
              <div className="mb-6 inline-flex p-6 bg-blue-600/20 rounded-full">
                <Camera className="w-16 h-16 text-blue-400" />
              </div>
              <button
                onClick={startCamera}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-2xl flex items-center gap-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 mx-auto"
              >
                <Camera className="w-6 h-6" />
                Start Camera
              </button>
              <p className="mt-4 text-gray-400 text-sm">Tap to begin scanning barcodes</p>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white p-6">
            <div className="text-center">
              <X className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
              <p className="text-gray-300 mb-4">{cameraError}</p>
              <button
                onClick={startCamera}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Try Again
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
              <div className="w-64 h-64 border-2 border-white opacity-50 rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
              </div>
            </div>
            
            {/* Instructions */}
            <div className="absolute top-4 left-4 right-4 text-center text-white bg-black/50 rounded-lg p-3">
              <p className="text-sm">Point camera at barcode</p>
              <p className="text-xs opacity-75">
                {isBarcodeDetectorSupported() ? 'Using native detection' : 'Using ZXing fallback'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls - sticky action bar */}
      <div className="p-4 bg-gray-900 sticky bottom-0">
        {isScanning && (
          <>
          <div className="flex justify-center gap-4 mb-2">
            <button
              onClick={toggleFlash}
              aria-label={flashOn ? 'Turn flashlight off' : 'Turn flashlight on'}
              className={`bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full ${!hasTorch ? 'opacity-50' : ''}`}
              disabled={!hasTorch}
            >
              {flashOn ? <Flashlight className="w-6 h-6" /> : <FlashlightOff className="w-6 h-6" />}
            </button>
            <button
              onClick={switchCamera}
              aria-label="Switch camera"
              className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
            <button
              onClick={stopScanning}
              aria-label="Stop scanning"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full"
            >
              Stop
            </button>
            <button
              onClick={() => {
                stopScanning();
                setTimeout(startCamera, 100);
              }}
              aria-label="Restart camera"
              className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
          {availableCameras.length > 1 && (
            <div className="text-center text-xs text-gray-400">
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
                className="flex-1 px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || addScanMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold"
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