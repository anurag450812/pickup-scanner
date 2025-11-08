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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header with modern styling */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10 shadow-soft">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Import / Export
          </h1>
          <div className="w-12" /> {/* Spacer for centered title */}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Export Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Export Data</h2>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-4 shadow-soft border border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Export all <span className="font-semibold text-blue-600 dark:text-blue-400">{allScans.length}</span> scans to backup your data or share with other devices.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* CSV Export */}
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:border-green-300 dark:hover:border-green-600 hover:shadow-lg transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">CSV Format</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Compatible with Excel and other spreadsheet applications
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-500 mb-4 font-mono">
                  Estimated size: {csvSize.formatted}
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={allScans.length === 0}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 w-full justify-center shadow-lg hover:shadow-xl transition-all"
                >
                  <Download className="w-5 h-5" />
                  Export CSV
                </button>
              </div>

              {/* JSON Export */}
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">JSON Format</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Complete data export with metadata for full restore
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-500 mb-4 font-mono">
                  Estimated size: {jsonSize.formatted}
                </div>
                <button
                  onClick={handleExportJSON}
                  disabled={allScans.length === 0}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 w-full justify-center shadow-lg hover:shadow-xl transition-all"
                >
                  <Download className="w-5 h-5" />
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Import Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FileUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import Data</h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft border border-gray-100 dark:border-gray-700">
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
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mb-4">
                      <Upload className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      Choose file to import
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Select a CSV or JSON file exported from this app
                    </p>
                    <div className="inline-flex bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-xl font-semibold items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                      <Upload className="w-5 h-5" />
                      Browse Files
                    </div>
                  </div>
                </label>
                
                <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <p>📁 Supported formats: CSV, JSON</p>
                  <p>📏 Maximum size: 10MB</p>
                </div>
              </div>
            ) : showImportPreview ? (
              /* Import preview */
              <div className="animate-fade-in">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Import Preview</h3>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{importFile.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Size: {(importFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                        Import will merge data
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300 mb-3">
                        Duplicate tracking numbers (same number on same day) will be skipped.
                        All other scans will be added to your existing data.
                      </p>
                      <p className="text-yellow-800 dark:text-yellow-200 font-bold">
                        📊 Potential new scans: {previewScansCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={performImport}
                    disabled={importMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    {importMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Import File
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearImport}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-all"
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