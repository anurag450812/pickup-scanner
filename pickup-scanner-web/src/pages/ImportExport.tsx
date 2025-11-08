import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  FileText, 
  Database,
  AlertTriangle,
  CheckCircle,
  X,
  FileDown,
  FileUp
} from 'lucide-react';
import { scanOperations } from '../db/dexie';
import { exportScansAsCSV, exportScansAsJSON, estimateExportSize } from '../lib/export';
import { importFromFile, validateImportFile, type ImportResult } from '../lib/import';

export default function ImportExport() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [previewScansCount, setPreviewScansCount] = useState<number>(0);
  
  const queryClient = useQueryClient();

  // Get all scans for export
  const { data: allScans = [] } = useQuery({
    queryKey: ['allScans'],
    queryFn: scanOperations.getAllScans
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const validation = validateImportFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const { result, scans } = await importFromFile(file);
      
      if (result.imported > 0) {
        await scanOperations.importScans(scans);
      }
      
      return result;
    },
    onSuccess: (result) => {
      setImportResults(result);
      queryClient.invalidateQueries({ queryKey: ['allScans'] });
      queryClient.invalidateQueries({ queryKey: ['homeStats'] });
      
      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} scans successfully`);
      } else {
        toast.warning('No new scans were imported');
      }
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImportFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Read once to get preview counts
    importFromFile(file).then(({ scans }) => {
      setPreviewScansCount(scans.length);
      // Don't persist result yet; user must confirm import
      setImportFile(file);
      setImportResults(null);
      setShowImportPreview(true);
    }).catch(err => {
      toast.error('Failed to parse file for preview');
      console.error(err);
    });
  };

  // Perform import
  const performImport = () => {
    if (importFile) {
      importMutation.mutate(importFile);
      setShowImportPreview(false);
    }
  };

  // Clear import
  const clearImport = () => {
    setImportFile(null);
    setImportResults(null);
    setShowImportPreview(false);
  };

  // Export handlers
  const handleExportCSV = () => {
    if (allScans.length === 0) {
      toast.error('No scans to export');
      return;
    }
    exportScansAsCSV(allScans);
    toast.success(`Exported ${allScans.length} scans as CSV`);
  };

  const handleExportJSON = () => {
    if (allScans.length === 0) {
      toast.error('No scans to export');
      return;
    }
    exportScansAsJSON(allScans);
    toast.success(`Exported ${allScans.length} scans as JSON`);
  };

  // Calculate export sizes
  const csvSize = allScans.length > 0 ? estimateExportSize(allScans, 'csv') : { size: 0, formatted: '0 Bytes' };
  const jsonSize = allScans.length > 0 ? estimateExportSize(allScans, 'json') : { size: 0, formatted: '0 Bytes' };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-semibold">Import / Export</h1>
          <div className="w-12" /> {/* Spacer for centered title */}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Export Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold">Export Data</h2>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Export all {allScans.length} scans to backup your data or share with other devices.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* CSV Export */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold">CSV Format</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Compatible with Excel and other spreadsheet applications
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                  Size: {csvSize.formatted}
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={allScans.length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 w-full justify-center"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              {/* JSON Export */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">JSON Format</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Complete data export with metadata for full restore
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                  Size: {jsonSize.formatted}
                </div>
                <button
                  onClick={handleExportJSON}
                  disabled={allScans.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 w-full justify-center"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Import Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-semibold">Import Data</h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            {!importFile ? (
              /* File selection */
              <div className="text-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Choose file to import
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Select a CSV or JSON file exported from this app
                    </p>
                    <div className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold inline-flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Browse Files
                    </div>
                  </div>
                </label>
                
                <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                  <p>Supported formats: CSV, JSON</p>
                  <p>Maximum size: 10MB</p>
                </div>
              </div>
            ) : showImportPreview ? (
              /* Import preview */
              <div>
                <h3 className="text-lg font-semibold mb-4">Import Preview</h3>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{importFile.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Size: {(importFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        Import will merge data
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        Duplicate tracking numbers (same number on same day) will be skipped.
                        All other scans will be added to your existing data.
                      </p>
                        <p className="mt-2 text-yellow-800 dark:text-yellow-200 font-medium">
                          Potential new scans: {previewScansCount}
                        </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={performImport}
                    disabled={importMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    {importMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import File
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearImport}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {/* Import results */}
            {importResults && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  {importResults.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                  <h3 className="font-semibold">
                    {importResults.success ? 'Import Completed' : 'Import Failed'}
                  </h3>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-green-600 text-lg">
                      {importResults.imported}
                    </div>
                    <div>Imported</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-yellow-600 text-lg">
                      {importResults.skipped}
                    </div>
                    <div>Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-600 text-lg">
                      {importResults.totalRows}
                    </div>
                    <div>Total Rows</div>
                  </div>
                </div>

                {importResults.errors.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="font-medium text-red-600 dark:text-red-400">Errors:</h4>
                    {importResults.errors.slice(0, 5).map((error, index) => (
                      <p key={index} className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    ))}
                    {importResults.errors.length > 5 && (
                      <p className="text-sm text-gray-500">
                        ... and {importResults.errors.length - 5} more errors
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={clearImport}
                  className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Import another file
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Data Info */}
        <section>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Data Format Information
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  CSV files include: tracking, timestamp, date, time, checked, deviceName<br />
                  JSON files include the same data plus export metadata and better type safety.
                  Both formats are compatible for reimporting.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}