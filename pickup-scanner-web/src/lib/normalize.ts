/**
 * Normalize tracking number by removing spaces and dashes, and converting to uppercase
 */
export function normalizeTracking(tracking: string): string {
  return tracking.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Format timestamp to readable time (HH:MM)
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

/**
 * Format timestamp to readable date (MM/DD/YYYY)
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago", "Yesterday")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  
  return formatDate(timestamp);
}

/**
 * Get start and end of day timestamps for a given date
 */
export function getDayRange(date: Date = new Date()): { start: number; end: number } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}

/**
 * Check if a timestamp is from today
 */
export function isToday(timestamp: number): boolean {
  const { start, end } = getDayRange();
  return timestamp >= start && timestamp <= end;
}

/**
 * Group timestamps by date
 */
export function groupByDate<T extends { timestamp: number }>(items: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  
  items.forEach(item => {
    const dateKey = formatDate(item.timestamp);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });
  
  return groups;
}

/**
 * Vibrate device if supported
 */
export function vibrate(pattern: number | number[] = 100): boolean {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
    return true;
  }
  return false;
}

/**
 * Play a beep sound
 */
export function playBeep(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // 800 Hz beep
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      oscillator.onended = () => resolve(true);
    } catch (error) {
      console.warn('Could not play beep:', error);
      resolve(false);
    }
  });
}

/**
 * Check if device supports camera
 */
export async function isCameraSupported(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch (error) {
    return false;
  }
}

/**
 * Check if BarcodeDetector is supported
 */
export function isBarcodeDetectorSupported(): boolean {
  return 'BarcodeDetector' in window;
}

/**
 * Request camera permissions
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    // Stop the stream immediately, we just wanted to check permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.warn('Camera permission denied:', error);
    return false;
  }
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;
  
  const normalizedText = text.replace(/[\s-]/g, '').toUpperCase();
  const normalizedTerm = normalizeTracking(searchTerm);
  
  if (!normalizedText.includes(normalizedTerm)) return text;
  
  // Find the position in the original text
  const regex = new RegExp(`(${normalizedTerm.split('').join('[\\s-]*')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-700">$1</mark>');
}