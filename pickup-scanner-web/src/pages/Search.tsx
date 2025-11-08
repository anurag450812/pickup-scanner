import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Search as SearchIcon, 
  CheckCircle2, 
  XCircle, 
  Copy,
  AlertTriangle,
  ClipboardPaste
} from 'lucide-react';
import { scanOperations, type Scan } from '../db/dexie';
import { formatTime, formatDate, debounce, normalizeTracking, highlightSearchTerm } from '../lib/normalize';

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
    } catch (error) {
      toast.error('Failed to perform bulk search');
    } finally {
      setIsSearching(false);
    }
  };

  // Focus search input on mount
  useEffect(() => {
    // Auto-focus search input unless already typing
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
    if (searchInput && !searchTerm) {
      setTimeout(() => searchInput.focus(), 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-semibold">Search & Verify</h1>
          <button
            onClick={() => setShowBulkSearch(!showBulkSearch)}
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            {showBulkSearch ? 'Single' : 'Bulk'}
          </button>
        </div>

        {/* Search modes */}
        <div className="p-4 border-b dark:border-gray-700">
          {!showBulkSearch ? (
            /* Single search */
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tracking numbers... (type anywhere)"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                autoComplete="off"
              />
            </div>
          ) : (
            /* Bulk search */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-gray-400" />
                <label className="font-medium">Bulk Search & Verify</label>
              </div>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Paste multiple tracking numbers (one per line or comma-separated)&#10;Example:&#10;1Z999AA1234567890&#10;9400111899562123456789&#10;123456789012"
                rows={4}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <button
                onClick={performBulkSearch}
                disabled={!bulkInput.trim() || isSearching}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <SearchIcon className="w-4 h-4" />
                    Search ({parseBulkInput(bulkInput).length} items)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        {!showBulkSearch ? (
          /* Single search results */
          <>
            {searchTerm.trim() && (
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {isLoading ? 'Searching...' : `Found ${searchResults.length} results`}
                {searchResults.length === 200 && ' (showing first 200)'}
              </div>
            )}

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((scan) => (
                  <div
                    key={scan.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div 
                            className="font-mono text-lg font-semibold"
                            dangerouslySetInnerHTML={{
                              __html: highlightSearchTerm(scan.tracking, searchTerm)
                            }}
                          />
                          <button
                            onClick={() => copyToClipboard(scan.tracking)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <div>{formatDate(scan.timestamp)} at {formatTime(scan.timestamp)}</div>
                          <div>Device: {scan.deviceName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {scan.checked ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchTerm.trim() && !isLoading ? (
              <div className="text-center py-12">
                <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No tracking numbers match "{searchTerm}"
                </p>
              </div>
            ) : !searchTerm.trim() ? (
              <div className="text-center py-12">
                <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Search Tracking Numbers
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Enter a tracking number to search for scanned parcels
                </p>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>💡 Press <kbd className="bg-gray-200 dark:bg-gray-600 px-1 rounded">Ctrl+K</kbd> or <kbd className="bg-gray-200 dark:bg-gray-600 px-1 rounded">/</kbd> to quick search</p>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          /* Bulk search results */
          <>
            {bulkResults.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="text-center p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                    <div className="font-bold text-lg">
                      {bulkResults.filter(r => r.found).length}
                    </div>
                    <div>Found</div>
                  </div>
                  <div className="text-center p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                    <div className="font-bold text-lg">
                      {bulkResults.filter(r => !r.found).length}
                    </div>
                    <div>Not Found</div>
                  </div>
                  <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded">
                    <div className="font-bold text-lg">
                      {bulkResults.length}
                    </div>
                    <div>Total</div>
                  </div>
                </div>
              </div>
            )}

            {bulkResults.length > 0 && (
              <div className="space-y-3">
                {bulkResults.map((result, index) => (
                  <div
                    key={index}
                    className={`bg-white dark:bg-gray-800 rounded-lg p-4 border-2 ${
                      result.found 
                        ? 'border-green-200 dark:border-green-800' 
                        : 'border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {result.found ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-semibold text-lg">
                            {result.tracking}
                          </span>
                          <button
                            onClick={() => copyToClipboard(result.tracking)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {result.found && result.scan && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <span>{formatDate(result.scan.timestamp)} at {formatTime(result.scan.timestamp)}</span>
                              {result.scan.checked && (
                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Checked
                                </span>
                              )}
                            </div>
                            <div>Device: {result.scan.deviceName}</div>
                          </div>
                        )}
                        
                        {!result.found && result.suggestions.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-sm mb-1">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Similar tracking numbers found:</span>
                            </div>
                            <div className="space-y-1">
                              {result.suggestions.slice(0, 3).map((suggestion) => (
                                <div key={suggestion.id} className="text-sm text-gray-600 dark:text-gray-400 ml-5">
                                  <span className="font-mono">{suggestion.tracking}</span>
                                  <span className="text-gray-400 dark:text-gray-500 ml-2">
                                    ({formatDate(suggestion.timestamp)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}