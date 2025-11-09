// API service for communicating with Netlify Functions
import type { Scan } from '../db/dexie';

const API_BASE = '/.netlify/functions';

export interface ApiResponse<T> {
  success?: boolean;
  scans?: T[];
  scan?: T;
  deleted?: number;
  error?: string;
  message?: string;
}

/**
 * Fetch all scans from Netlify
 */
export async function fetchScansFromNetlify(): Promise<Scan[]> {
  try {
    const response = await fetch(`${API_BASE}/scans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<Scan> = await response.json();
    return data.scans || [];
  } catch (error) {
    console.error('Failed to fetch scans from Netlify:', error);
    throw error;
  }
}

/**
 * Save a scan to Netlify
 */
export async function saveScanToNetlify(scan: Omit<Scan, 'id'>): Promise<Scan> {
  try {
    const response = await fetch(`${API_BASE}/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scan),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<Scan> = await response.json();
    if (!data.scan) {
      throw new Error('No scan returned from server');
    }
    return data.scan;
  } catch (error) {
    console.error('Failed to save scan to Netlify:', error);
    throw error;
  }
}

/**
 * Update a scan on Netlify
 */
export async function updateScanOnNetlify(
  id: string | number,
  updates: Partial<Scan>
): Promise<Scan> {
  try {
    const response = await fetch(`${API_BASE}/scans`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, updates }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<Scan> = await response.json();
    if (!data.scan) {
      throw new Error('No scan returned from server');
    }
    return data.scan;
  } catch (error) {
    console.error('Failed to update scan on Netlify:', error);
    throw error;
  }
}

/**
 * Delete scans from Netlify
 */
export async function deleteScansFromNetlify(ids: (string | number)[]): Promise<number> {
  try {
    const response = await fetch(`${API_BASE}/scans`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<Scan> = await response.json();
    return data.deleted || 0;
  } catch (error) {
    console.error('Failed to delete scans from Netlify:', error);
    throw error;
  }
}

/**
 * Sync local scans to Netlify (bulk upload)
 */
export async function syncScansToNetlify(scans: Omit<Scan, 'id'>[]): Promise<void> {
  try {
    // Upload scans one by one (can be optimized with batch endpoint later)
    const promises = scans.map(scan => saveScanToNetlify(scan));
    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to sync scans to Netlify:', error);
    throw error;
  }
}
