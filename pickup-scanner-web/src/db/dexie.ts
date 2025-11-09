import Dexie, { type EntityTable } from 'dexie';
import { saveScanToNetlify, updateScanOnNetlify, deleteScansFromNetlify } from '../lib/api';

// Define the scan interface
export interface Scan {
  id?: number;
  netlifyId?: string; // Store Netlify's ID for syncing
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

// Define the database
const db = new Dexie('pickup_scanner_db') as Dexie & {
  scans: EntityTable<Scan, 'id'>;
  logs: EntityTable<Log, 'id'>;
};

// Define schemas
db.version(1).stores({
  scans: '++id, tracking, timestamp, deviceName, checked',
  logs: '++id, message, ts',
});

// Migration to add netlifyId field
db.version(2).stores({
  scans: '++id, tracking, timestamp, deviceName, checked, netlifyId',
  logs: '++id, message, ts',
});

// CRUD operations for scans
export const scanOperations = {
  // Add a new scan
  async addScan(scan: Omit<Scan, 'id'>): Promise<number> {
    // Save to local database first
    const id = await db.scans.add(scan);
    
    // Then sync to Netlify in the background
    try {
      const netlifyResponse = await saveScanToNetlify(scan);
      // Update local record with Netlify ID
      if (netlifyResponse.id) {
        await db.scans.update(id, { netlifyId: String(netlifyResponse.id) });
      }
    } catch (error) {
      console.error('Failed to sync scan to Netlify:', error);
      // Continue - local save succeeded, Netlify sync can retry later
    }
    
    return id as number;
  },

  // Get all scans, sorted by newest first
  async getAllScans(): Promise<Scan[]> {
    return await db.scans.orderBy('timestamp').reverse().toArray();
  },

  // Get scans for a specific date (timestamp range)
  async getScansByDate(startOfDay: number, endOfDay: number): Promise<Scan[]> {
    return await db.scans
      .where('timestamp')
      .between(startOfDay, endOfDay)
      .toArray();
  },

  // Search scans by tracking number (substring search)
  async searchScans(term: string, limit: number = 200): Promise<Scan[]> {
    const normalizedTerm = term.replace(/[\s-]/g, '').toUpperCase();
    return await db.scans
      .filter(scan => scan.tracking.includes(normalizedTerm))
      .reverse()
      .limit(limit)
      .toArray();
  },

  // Check if tracking exists for today
  async checkDuplicateToday(tracking: string): Promise<Scan | undefined> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
    
    return await db.scans
      .where('tracking')
      .equals(tracking)
      .and(scan => scan.timestamp >= startOfDay && scan.timestamp <= endOfDay)
      .first();
  },

  // Update scan checked status
  async updateScanChecked(id: number, checked: boolean): Promise<number> {
    const result = await db.scans.update(id, { checked });
    
    // Sync to Netlify in the background
    try {
      const scan = await db.scans.get(id);
      if (scan?.netlifyId) {
        await updateScanOnNetlify(scan.netlifyId, { checked });
      }
    } catch (error) {
      console.error('Failed to sync checked status to Netlify:', error);
      // Continue - local update succeeded
    }
    
    return result;
  },

  // Delete scans by IDs
  async deleteScans(ids: number[]): Promise<void> {
    // Get netlify IDs before deleting
    const netlifyIds: string[] = [];
    for (const id of ids) {
      const scan = await db.scans.get(id);
      if (scan?.netlifyId) {
        netlifyIds.push(scan.netlifyId);
      }
    }
    
    // Delete from local database
    await db.scans.bulkDelete(ids);
    
    // Sync deletions to Netlify in the background
    if (netlifyIds.length > 0) {
      try {
        await deleteScansFromNetlify(netlifyIds);
      } catch (error) {
        console.error('Failed to sync deletions to Netlify:', error);
        // Continue - local deletion succeeded
      }
    }
  },

  // Get scan by exact tracking number
  async getScanByTracking(tracking: string): Promise<Scan | undefined> {
    return await db.scans.where('tracking').equals(tracking).first();
  },

  // Get latest scan
  async getLatestScan(): Promise<Scan | undefined> {
    return await db.scans.orderBy('timestamp').reverse().first();
  },

  // Get scans count
  async getScansCount(): Promise<number> {
    return await db.scans.count();
  },

  // Clear all scans
  async clearAllScans(): Promise<void> {
    await db.scans.clear();
  },

  // Export all scans
  async exportAllScans(): Promise<Scan[]> {
    return await db.scans.toArray();
  },

  // Import scans (merge, skip duplicates by tracking + same day)
  async importScans(scans: Omit<Scan, 'id'>[]): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const scan of scans) {
      const existing = await this.checkDuplicateToday(scan.tracking);
      if (existing) {
        skipped++;
      } else {
        await this.addScan(scan);
        imported++;
      }
    }

    return { imported, skipped };
  }
};

// CRUD operations for logs
export const logOperations = {
  // Add a log entry
  async addLog(message: string): Promise<number> {
    const id = await db.logs.add({
      message,
      ts: Date.now()
    });
    return id as number;
  },

  // Get recent logs
  async getRecentLogs(limit: number = 100): Promise<Log[]> {
    return await db.logs.orderBy('ts').reverse().limit(limit).toArray();
  },

  // Clear old logs (keep only recent ones)
  async clearOldLogs(keepRecentCount: number = 1000): Promise<void> {
    const allLogs = await db.logs.orderBy('ts').reverse().toArray();
    if (allLogs.length > keepRecentCount) {
      const logsToDelete = allLogs.slice(keepRecentCount);
      const idsToDelete = logsToDelete.map(log => log.id!);
      await db.logs.bulkDelete(idsToDelete);
    }
  },

  // Clear all logs
  async clearAllLogs(): Promise<void> {
    await db.logs.clear();
  }
};

// Database utilities
export const dbUtils = {
  // Get database size estimate
  async getDatabaseSize(): Promise<{ scans: number; logs: number }> {
    const scansCount = await db.scans.count();
    const logsCount = await db.logs.count();
    return { scans: scansCount, logs: logsCount };
  },

  // Clear entire database
  async clearDatabase(): Promise<void> {
    await db.scans.clear();
    await db.logs.clear();
  },

  // Check if database is available
  async isDatabaseAvailable(): Promise<boolean> {
    try {
      await db.open();
      return true;
    } catch (error) {
      console.error('Database not available:', error);
      return false;
    }
  }
};

export default db;