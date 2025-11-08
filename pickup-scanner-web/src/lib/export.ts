import type { Scan } from '../db/dexie';
import { formatDate, formatTime } from './normalize';

/**
 * Convert scans to CSV format
 */
export function exportToCSV(scans: Scan[]): string {
  const headers = ['tracking', 'timestamp', 'date', 'time', 'checked', 'deviceName'];
  const csvHeaders = headers.join(',');
  
  const csvRows = scans.map(scan => {
    const row = [
      `"${scan.tracking}"`,
      scan.timestamp.toString(),
      `"${formatDate(scan.timestamp)}"`,
      `"${formatTime(scan.timestamp)}"`,
      scan.checked.toString(),
      `"${scan.deviceName}"`
    ];
    return row.join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Convert scans to JSON format
 */
export function exportToJSON(scans: Scan[]): string {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalScans: scans.length,
    scans: scans.map(scan => ({
      tracking: scan.tracking,
      timestamp: scan.timestamp,
      date: formatDate(scan.timestamp),
      time: formatTime(scan.timestamp),
      checked: scan.checked,
      deviceName: scan.deviceName
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Download data as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateExportFilename(prefix: string, extension: string): string {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.${extension}`;
}

/**
 * Export scans as CSV file
 */
export async function exportScansAsCSV(scans: Scan[]): Promise<void> {
  const csvContent = exportToCSV(scans);
  const filename = generateExportFilename('pickup-scans', 'csv');
  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Export scans as JSON file
 */
export async function exportScansAsJSON(scans: Scan[]): Promise<void> {
  const jsonContent = exportToJSON(scans);
  const filename = generateExportFilename('pickup-scans', 'json');
  downloadFile(jsonContent, filename, 'application/json');
}

/**
 * Get file size in a human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Estimate export file size
 */
export function estimateExportSize(scans: Scan[], format: 'csv' | 'json'): { size: number; formatted: string } {
  let content: string;
  
  if (format === 'csv') {
    content = exportToCSV(scans);
  } else {
    content = exportToJSON(scans);
  }
  
  const size = new Blob([content]).size;
  return {
    size,
    formatted: formatFileSize(size)
  };
}