import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Search as SearchIcon,
  CheckCircle2,
  XCircle,
  Copy,
  AlertTriangle,
  ClipboardPaste,
  Circle,
} from 'lucide-react';
import { scanOperations, type Scan } from '../db/dexie';
import { formatTime, formatDate, debounce, normalizeTracking, highlightSearchTerm } from '../lib/normalize';
import { PageLayout } from '../components/PageLayout';

// Interface for bulk search result
interface BulkSearchResult {
  tracking: string;
  found: boolean;
  scan?: Scan;
  suggestions: Scan[];
}

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkSearchResult[]>([]);
  const [showBulkSearch, setShowBulkSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((term: string) => {
      setDebouncedTerm(term);
    }, 150),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Search results query
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['search', debouncedTerm],
    queryFn: async () => {
      if (!debouncedTerm.trim()) return [];
      const normalized = normalizeTracking(debouncedTerm);
      return scanOperations.searchScans(normalized, 200);
    },
    enabled: !!debouncedTerm.trim()
  });

  // Copy tracking number to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  // Parse bulk input into individual tracking numbers
  const parseBulkInput = (input: string): string[] => {
    return input
      .split(/[\n,;]+/) // Split by newlines, commas, or semicolons
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => normalizeTracking(line));
  };

  // Perform bulk search
  const performBulkSearch = async () => {
    const trackingNumbers = parseBulkInput(bulkInput);
    
    if (trackingNumbers.length === 0) {
      toast.error('No valid tracking numbers found');
      return;
    }

    setIsSearching(true);
    const results: BulkSearchResult[] = [];

    try {
      for (const tracking of trackingNumbers) {
        // Look for exact match first
        const exactMatch = await scanOperations.getScanByTracking(tracking);
        
        // Get suggestions (substring matches)
        const suggestions = await scanOperations.searchScans(tracking, 5);
        const filteredSuggestions = suggestions.filter(s => s.tracking !== tracking);

        results.push({
          tracking,
          found: !!exactMatch,
          scan: exactMatch,
          suggestions: filteredSuggestions
        });
      }

      setBulkResults(results);
      
      const foundCount = results.filter(r => r.found).length;
      const totalCount = results.length;
      
      if (foundCount === totalCount) {
        toast.success(`All ${totalCount} tracking numbers found!`);
      } else if (foundCount === 0) {
        toast.warning(`None of ${totalCount} tracking numbers found`);
      } else {
        toast.info(`Found ${foundCount} of ${totalCount} tracking numbers`);
      }
    } catch {
      toast.error('Failed to perform bulk search');
    } finally {
      setIsSearching(false);
    }
  };

  // Focus search input on mount
  useEffect(() => {
    if (searchTerm) return;

    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement | null;
    if (!searchInput) return;

    const timer = window.setTimeout(() => searchInput.focus(), 100);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const toggleButton = (
    <button
      onClick={() => setShowBulkSearch(!showBulkSearch)}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
    >
      <ArrowLeft className={`h-3.5 w-3.5 transition ${showBulkSearch ? 'rotate-180 opacity-70' : 'opacity-0'}`} />
      {showBulkSearch ? 'Single search' : 'Bulk search'}
    </button>
  );

  return (
    <PageLayout
      title="Search & verify"
      subtitle={showBulkSearch ? 'Check many tracking numbers at once' : 'Instantly find a scanned parcel'}
      backTo="/"
      actions={toggleButton}
    >
      <div className="space-y-6 pb-6">
        {!showBulkSearch ? (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Search by tracking number
            </label>
            <div className="relative mt-3">
              <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter a tracking number"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-base text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400"
                autoComplete="off"
              />
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Tip: press <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[11px] dark:border-slate-700 dark:bg-slate-900">/</kbd> to focus this field from anywhere.
            </p>
          </section>
        ) : (
          <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <ClipboardPaste className="h-4 w-4 text-blue-500" />
              Bulk search & verify
            </div>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={5}
              placeholder="Paste one tracking number per line or separate with commas"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-700 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              onClick={performBulkSearch}
              disabled={!bulkInput.trim() || isSearching}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSearching ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                  Searching…
                </>
              ) : (
                <>
                  <SearchIcon className="h-4 w-4" />
                  Search {parseBulkInput(bulkInput).length > 0 && `(${parseBulkInput(bulkInput).length})`}
                </>
              )}
            </button>
          </section>
        )}

        {!showBulkSearch ? (
          <section className="space-y-4">
            {searchTerm.trim() && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isLoading ? 'Searching…' : `Found ${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
                {searchResults.length === 200 && ' (showing first 200)'}
              </p>
            )}

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((scan) => (
                  <article
                    key={scan.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-blue-300 dark:border-slate-800/70 dark:bg-slate-900/70 dark:hover:border-blue-500/30"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-start gap-2">
                          <div
                            className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100"
                            dangerouslySetInnerHTML={{ __html: highlightSearchTerm(scan.tracking, searchTerm) }}
                          />
                          <button
                            onClick={() => copyToClipboard(scan.tracking)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                            aria-label="Copy tracking"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <ul className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                          <li>
                            <span className="font-medium text-slate-600 dark:text-slate-200">{formatDate(scan.timestamp)}</span>
                            <span className="px-1 text-slate-300 dark:text-slate-600">•</span>
                            {formatTime(scan.timestamp)}
                          </li>
                          <li>
                            Device: <span className="font-medium text-slate-600 dark:text-slate-200">{scan.deviceName}</span>
                          </li>
                        </ul>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                          scan.checked
                            ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {scan.checked ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        {scan.checked ? 'Checked' : 'Pending'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : searchTerm.trim() && !isLoading ? (
              <EmptySearch message={`No results for "${searchTerm}"`} icon={SearchIcon} />
            ) : (
              <EmptySearch message="Search tracking numbers to see history" icon={SearchIcon} />
            )}
          </section>
        ) : (
          <section className="space-y-4">
            {bulkResults.length > 0 && (
              <div className="grid grid-cols-3 gap-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <p className="text-lg font-bold">{bulkResults.filter((r) => r.found).length}</p>
                  <p>Found</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 py-3 text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
                  <p className="text-lg font-bold">{bulkResults.filter((r) => !r.found).length}</p>
                  <p>Missing</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 py-3 text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300">
                  <p className="text-lg font-bold">{bulkResults.length}</p>
                  <p>Total</p>
                </div>
              </div>
            )}

            {bulkResults.length > 0 ? (
              <div className="space-y-3">
                {bulkResults.map((result, index) => (
                  <article
                    key={`${result.tracking}-${index}`}
                    className={`rounded-2xl border p-4 shadow-sm transition ${
                      result.found
                        ? 'border-emerald-200 bg-white dark:border-emerald-900/40 dark:bg-slate-900/70'
                        : 'border-rose-200 bg-white dark:border-rose-900/40 dark:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="flex items-center gap-2 font-mono text-base font-semibold text-slate-900 dark:text-slate-100">
                          {result.tracking}
                          <button
                            onClick={() => copyToClipboard(result.tracking)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </p>
                        {result.found && result.scan ? (
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {formatDate(result.scan.timestamp)} · {formatTime(result.scan.timestamp)} · {result.scan.deviceName}
                          </p>
                        ) : null}
                        {!result.found && result.suggestions.length > 0 && (
                          <div className="mt-3 space-y-1 text-sm text-amber-600 dark:text-amber-300">
                            <p className="flex items-center gap-2 font-semibold">
                              <AlertTriangle className="h-4 w-4" /> Similar entries
                            </p>
                            {result.suggestions.slice(0, 3).map((suggestion) => (
                              <p key={suggestion.id} className="pl-6 text-slate-500 dark:text-slate-400">
                                <span className="font-mono">{suggestion.tracking}</span>
                                <span className="px-1 text-slate-400">•</span>
                                {formatDate(suggestion.timestamp)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                          result.found
                            ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300'
                        }`}
                      >
                        {result.found ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {result.found ? 'Found' : 'Not found'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySearch message="Paste tracking numbers above to verify" icon={ClipboardPaste} />
            )}
          </section>
        )}
      </div>
    </PageLayout>
  );
}

function EmptySearch({ message, icon: Icon }: { message: string; icon: typeof SearchIcon }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Icon className="h-7 w-7" />
      </div>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </section>
  );
}