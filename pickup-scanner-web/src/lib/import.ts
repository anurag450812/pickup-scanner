import Papa from 'papaparse';
import type { Scan } from '../db/dexie';
import { normalizeTracking } from './normalize';

// Interface for imported scan data (before validation)
interface ImportedScanData {
  tracking?: string;
  timestamp?: string | number;
  date?: string;
  time?: string;
  checked?: string | boolean;
  deviceName?: string;
  [key: string]: any; // Allow additional fields
}

// Result of import operation
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  totalRows: number;
}

/**
 * Validate and normalize imported scan data
 */
function validateAndNormalizeScan(data: ImportedScanData, rowIndex: number): { scan: Omit<Scan, 'id'> | null; error: string | null } {
  const errors: string[] = [];
  
  // Validate tracking
  if (!data.tracking || typeof data.tracking !== 'string' || data.tracking.trim() === '') {
    errors.push(`Row ${rowIndex}: Missing or invalid tracking number`);
  }
  
  // Validate timestamp
  let timestamp: number;
  if (typeof data.timestamp === 'number') {
    timestamp = data.timestamp;
  } else if (typeof data.timestamp === 'string') {
    const parsed = parseInt(data.timestamp, 10);
    if (isNaN(parsed)) {
      errors.push(`Row ${rowIndex}: Invalid timestamp format`);
      timestamp = Date.now(); // fallback
    } else {
      timestamp = parsed;
    }
  } else {
    // Try to parse from date/time if available
    if (data.date && data.time) {
      const dateTimeStr = `${data.date} ${data.time}`;
      const parsed = new Date(dateTimeStr).getTime();
      if (isNaN(parsed)) {
        errors.push(`Row ${rowIndex}: Could not parse date/time`);
        timestamp = Date.now();
      } else {
        timestamp = parsed;
      }
    } else {
      timestamp = Date.now(); // fallback to current time
    }
  }
  
  // Validate checked status
  let checked = false;
  if (typeof data.checked === 'boolean') {
    checked = data.checked;
  } else if (typeof data.checked === 'string') {
    checked = data.checked.toLowerCase() === 'true';
  }
  
  // Validate device name
  const deviceName = data.deviceName && typeof data.deviceName === 'string' 
    ? data.deviceName.trim() 
    : 'Unknown';
  
  if (errors.length > 0) {
    return { scan: null, error: errors.join('; ') };
  }
  
  return {
    scan: {
      tracking: normalizeTracking(data.tracking!),
      timestamp,
      checked,
      deviceName
    },
    error: null
  };
}

/**
 * Parse CSV content and return scan data
 */
export function parseCSV(csvContent: string): Promise<{ result: ImportResult; scans: Omit<Scan, 'id'>[] }> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const validScans: Omit<Scan, 'id'>[] = [];

    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let imported = 0;
        let skipped = 0;

        results.data.forEach((row: any, index: number) => {
          const { scan, error } = validateAndNormalizeScan(row, index + 2); // +2 because header is row 1

          if (error) {
            errors.push(error);
            skipped++;
          } else if (scan) {
            validScans.push(scan);
            imported++;
          }
        });

        const result: ImportResult = {
          success: imported > 0 && errors.length === 0, // success only if no row errors
          imported,
            skipped,
          errors,
          totalRows: results.data.length
        };
        resolve({ result, scans: validScans });
      },
      error: (error: any) => {
        const result: ImportResult = {
          success: false,
          imported: 0,
          skipped: 0,
          errors: [`CSV parsing error: ${error.message}`],
          totalRows: 0
        };
        resolve({ result, scans: [] });
      }
    });
  });
}

/**
 * Parse JSON content and return scan data
 */
export function parseJSON(jsonContent: string): { result: ImportResult; scans: Omit<Scan, 'id'>[] } {
  const errors: string[] = [];
  const validScans: Omit<Scan, 'id'>[] = [];

  try {
    const data = JSON.parse(jsonContent);

    // Check if it's our export format
    let scansArray: any[];
    if (data.scans && Array.isArray(data.scans)) {
      scansArray = data.scans;
    } else if (Array.isArray(data)) {
      scansArray = data;
    } else {
      return {
        result: {
          success: false,
          imported: 0,
          skipped: 0,
          errors: ['Invalid JSON format: Expected array of scans or object with scans property'],
          totalRows: 0
        },
        scans: []
      };
    }

    let imported = 0;
    let skipped = 0;

    scansArray.forEach((item, index) => {
      const { scan, error } = validateAndNormalizeScan(item, index + 1);

      if (error) {
        errors.push(error);
        skipped++;
      } else if (scan) {
        validScans.push(scan);
        imported++;
      }
    });

    const result: ImportResult = {
      success: imported > 0 && errors.length === 0,
      imported,
      skipped,
      errors,
      totalRows: scansArray.length
    };
    return { result, scans: validScans };

  } catch (error) {
    return {
      result: {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        totalRows: 0
      },
      scans: []
    };
  }
}

/**
 * Read file content as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Import scans from a file
 */
export async function importFromFile(file: File): Promise<{ result: ImportResult; scans: Omit<Scan, 'id'>[] }> {
  const content = await readFileAsText(file);
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    const { result, scans } = await parseCSV(content);
    return { result, scans };
  } else if (extension === 'json') {
    const { result, scans } = parseJSON(content);
    return { result, scans };
  }

  return {
    result: {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [`Unsupported file format: ${extension}. Please use CSV or JSON files.`],
      totalRows: 0
    },
    scans: []
  };
}

/**
 * Validate file before import
 */
export function validateImportFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedExtensions = ['csv', 'json'];
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.'
    };
  }
  
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'Invalid file type. Please use CSV or JSON files.'
    };
  }
  
  return { valid: true };
}