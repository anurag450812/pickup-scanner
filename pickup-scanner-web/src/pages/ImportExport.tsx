import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Download,
  Upload,
  FileText,
  Database,
  AlertTriangle,
  CheckCircle,
  X,
  FileDown,
  FileUp,
} from 'lucide-react';
import { scanOperations } from '../db/dexie';
import { exportScansAsCSV, exportScansAsJSON, estimateExportSize } from '../lib/export';
import { importFromFile, validateImportFile, type ImportResult } from '../lib/import';
import { PageLayout } from '../components/PageLayout';

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
    <PageLayout
      title="Import & export"
      subtitle="Keep your data backed up and in sync"
      backTo="/"
    >
      <div className="space-y-8 pb-6">
        <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
          <header className="flex items-center gap-3">
            <FileDown className="h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Export data</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {allScans.length} scans ready to download.
              </p>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-slate-800/70 dark:bg-slate-900/70 dark:hover:border-emerald-500/30">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">CSV format</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Perfect for spreadsheets</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-mono text-slate-500 dark:text-slate-400">Estimated size · {csvSize.formatted}</p>
              <button
                onClick={handleExportCSV}
                disabled={allScans.length === 0}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </article>

            <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-slate-800/70 dark:bg-slate-900/70 dark:hover:border-blue-500/30">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                  <Database className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">JSON format</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Full fidelity backup</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-mono text-slate-500 dark:text-slate-400">Estimated size · {jsonSize.formatted}</p>
              <button
                onClick={handleExportJSON}
                disabled={allScans.length === 0}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <Download className="h-4 w-4" /> Export JSON
              </button>
            </article>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
          <header className="flex items-center gap-3">
            <FileUp className="h-5 w-5 text-purple-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Import data</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Merge exported scans into this device.</p>
            </div>
          </header>

          <div className="mt-5">
            {!importFile ? (
              <div className="text-center">
                <label className="block cursor-pointer">
                  <input type="file" accept=".csv,.json" onChange={handleFileSelect} className="hidden" />
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 transition hover:border-purple-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-purple-500">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                      <Upload className="h-8 w-8" />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">Select a CSV or JSON file</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Files exported from Pickup Scanner work best.</p>
                    <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-500">
                      <Upload className="h-4 w-4" /> Browse files
                    </span>
                  </div>
                </label>
                <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Supports up to 10MB · CSV or JSON</p>
              </div>
            ) : showImportPreview ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800/70 dark:bg-slate-900/70">
                  <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">{importFile.name}</span>
                    <span className="text-xs text-slate-400">{(importFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <div>
                      <p className="font-semibold">Duplicates are skipped automatically.</p>
                      <p className="mt-1">Potential new scans: {previewScansCount}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={performImport}
                    disabled={importMutation.isPending}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-purple-300"
                  >
                    {importMutation.isPending ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                        Importing…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Import file
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearImport}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {importResults && (
              <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300">
                <div className="flex items-center gap-2 text-base font-semibold">
                  {importResults.success ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <X className="h-5 w-5 text-rose-500" />
                  )}
                  {importResults.success ? 'Import complete' : 'Import failed'}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Imported</dt>
                    <dd className="text-lg font-bold text-emerald-600 dark:text-emerald-300">{importResults.imported}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Skipped</dt>
                    <dd className="text-lg font-bold text-amber-600 dark:text-amber-300">{importResults.skipped}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Total rows</dt>
                    <dd className="text-lg font-bold text-slate-600 dark:text-slate-200">{importResults.totalRows}</dd>
                  </div>
                </dl>
                {importResults.errors.length > 0 && (
                  <div className="mt-4 space-y-1">
                    <p className="font-semibold text-rose-500 dark:text-rose-300">Errors</p>
                    {importResults.errors.slice(0, 5).map((error, index) => (
                      <p key={index}>{error}</p>
                    ))}
                    {importResults.errors.length > 5 && (
                      <p className="text-xs text-slate-400">…and {importResults.errors.length - 5} more</p>
                    )}
                  </div>
                )}
                <button
                  onClick={clearImport}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Import another file
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-700 shadow-sm dark:border-blue-900/40 dark:bg-blue-500/10 dark:text-blue-200">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5" />
            <div>
              <p className="font-semibold">Data formats</p>
              <p className="mt-1">
                CSV exports include tracking, timestamp, checked state, and device name. JSON exports preserve the same data plus metadata so you can restore exactly what you exported.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}