import { saveScanToNetlify, updateScanOnNetlify, deleteScansFromNetlify, fetchScansFromNetlify } from '../lib/api';

// Define the scan interface
export interface Scan {
  id?: string | number; // Netlify ID (string) or local fallback (number)
  tracking: string;
  timestamp: number;
  deviceName: string;
  checked: boolean;
}

// Define the log interface
export interface Log {
  id?: number;
  message: string;
  ts: number;
}

// NO LOCAL DATABASE - Everything stored in Netlify cloud

// CRUD operations for scans - ALL DATA FROM NETLIFY CLOUD
export const scanOperations = {
  // Add a new scan - DIRECTLY TO NETLIFY
  async addScan(scan: Omit<Scan, 'id'>): Promise<string> {
    try {
      const netlifyResponse = await saveScanToNetlify(scan);
      return String(netlifyResponse.id);
    } catch (error) {
      console.error('Failed to save scan to Netlify:', error);
      throw error;
    }
  },

  // Get all scans - FROM NETLIFY
  async getAllScans(): Promise<Scan[]> {
    try {
      const scans = await fetchScansFromNetlify();
      // Sort by timestamp, newest first
      return scans.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to fetch scans from Netlify:', error);
      return [];
    }
  },

  // Get scans for a specific date (timestamp range) - FROM NETLIFY
  async getScansByDate(startOfDay: number, endOfDay: number): Promise<Scan[]> {
    try {
      const allScans = await fetchScansFromNetlify();
      return allScans.filter(
        scan => scan.timestamp >= startOfDay && scan.timestamp <= endOfDay
      );
    } catch (error) {
      console.error('Failed to fetch scans by date from Netlify:', error);
      return [];
    }
  },

  // Search scans by tracking number (substring search) - FROM NETLIFY
  async searchScans(term: string, limit: number = 200): Promise<Scan[]> {
    try {
      const normalizedTerm = term.replace(/[\s-]/g, '').toUpperCase();
      const allScans = await fetchScansFromNetlify();
      return allScans
        .filter(scan => scan.tracking.includes(normalizedTerm))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to search scans from Netlify:', error);
      return [];
    }
  },

  // Check if tracking exists for today - FROM NETLIFY
  async checkDuplicateToday(tracking: string): Promise<Scan | undefined> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
      
      const allScans = await fetchScansFromNetlify();
      return allScans.find(
        scan => 
          scan.tracking === tracking && 
          scan.timestamp >= startOfDay && 
          scan.timestamp <= endOfDay
      );
    } catch (error) {
      console.error('Failed to check duplicate from Netlify:', error);
      return undefined;
    }
  },

  // Update scan checked status - DIRECTLY TO NETLIFY
  async updateScanChecked(id: string | number, checked: boolean): Promise<number> {
    try {
      await updateScanOnNetlify(id, { checked });
      return 1; // Success
    } catch (error) {
      console.error('Failed to update scan on Netlify:', error);
      throw error;
    }
  },

  // Delete scans by IDs - DIRECTLY TO NETLIFY
  async deleteScans(ids: (string | number)[]): Promise<void> {
    try {
      await deleteScansFromNetlify(ids);
    } catch (error) {
      console.error('Failed to delete scans from Netlify:', error);
      throw error;
    }
  },

  // Get scan by exact tracking number - FROM NETLIFY
  async getScanByTracking(tracking: string): Promise<Scan | undefined> {
    try {
      const allScans = await fetchScansFromNetlify();
      return allScans.find(scan => scan.tracking === tracking);
    } catch (error) {
      console.error('Failed to get scan by tracking from Netlify:', error);
      return undefined;
    }
  },

  // Get latest scan - FROM NETLIFY
  async getLatestScan(): Promise<Scan | undefined> {
    try {
      const scans = await fetchScansFromNetlify();
      if (scans.length === 0) return undefined;
      return scans.sort((a, b) => b.timestamp - a.timestamp)[0];
    } catch (error) {
      console.error('Failed to get latest scan from Netlify:', error);
      return undefined;
    }
  },

  // Get scans count - FROM NETLIFY
  async getScansCount(): Promise<number> {
    try {
      const scans = await fetchScansFromNetlify();
      return scans.length;
    } catch (error) {
      console.error('Failed to get scans count from Netlify:', error);
      return 0;
    }
  },

  // Clear all scans - FROM NETLIFY
  async clearAllScans(): Promise<void> {
    try {
      const allScans = await fetchScansFromNetlify();
      const ids = allScans.map(scan => scan.id).filter((id): id is string | number => id !== undefined);
      if (ids.length > 0) {
        await deleteScansFromNetlify(ids);
      }
    } catch (error) {
      console.error('Failed to clear all scans from Netlify:', error);
      throw error;
    }
  },

  // Export all scans - FROM NETLIFY
  async exportAllScans(): Promise<Scan[]> {
    try {
      return await fetchScansFromNetlify();
    } catch (error) {
      console.error('Failed to export scans from Netlify:', error);
      return [];
    }
  },

  // Import scans (merge, skip duplicates by tracking + same day) - TO NETLIFY
  async importScans(scans: Omit<Scan, 'id'>[]): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const scan of scans) {
      try {
        const existing = await this.checkDuplicateToday(scan.tracking);
        if (existing) {
          skipped++;
        } else {
          await this.addScan(scan);
          imported++;
        }
      } catch (error) {
        console.error('Failed to import scan:', error);
        skipped++;
      }
    }

    return { imported, skipped };
  }
};

// CRUD operations for logs - REMOVED (not needed for cloud-only storage)
export const logOperations = {
  async addLog(message: string): Promise<number> {
    console.log('Log:', message);
    return Date.now();
  },

  async getRecentLogs(_limit: number = 100): Promise<Log[]> {
    return [];
  },

  async clearOldLogs(_keepRecentCount: number = 1000): Promise<void> {
    // No-op
  },

  async clearAllLogs(): Promise<void> {
    // No-op
  }
};

// Database utilities - REMOVED (cloud-only, no local database)
export const dbUtils = {
  async getDatabaseSize(): Promise<{ scans: number; logs: number }> {
    const scansCount = await scanOperations.getScansCount();
    return { scans: scansCount, logs: 0 };
  },

  async clearDatabase(): Promise<void> {
    await scanOperations.clearAllScans();
  },

  async isDatabaseAvailable(): Promise<boolean> {
    return true; // Always available (Netlify cloud)
  }
};