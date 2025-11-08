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
  ClipboardPaste,
  Circle
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header with modern styling */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10 shadow-soft">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Search & Verify
          </h1>
          <button
            onClick={() => setShowBulkSearch(!showBulkSearch)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              showBulkSearch 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
          >
            {showBulkSearch ? 'Single' : 'Bulk'}
          </button>
        </div>

        {/* Search modes with modern design */}
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {!showBulkSearch ? (
            /* Single search */
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tracking numbers..."
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-lg"
                autoComplete="off"
              />
            </div>
          ) : (
            /* Bulk search */
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <ClipboardPaste className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <label className="font-semibold">Bulk Search & Verify</label>
              </div>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Paste multiple tracking numbers (one per line or comma-separated)&#10;Example:&#10;1Z999AA1234567890&#10;9400111899562123456789&#10;123456789012"
                rows={5}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all font-mono text-sm"
              />
              <button
                onClick={performBulkSearch}
                disabled={!bulkInput.trim() || isSearching}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <SearchIcon className="w-5 h-5" />
                    Search {parseBulkInput(bulkInput).length > 0 && `(${parseBulkInput(bulkInput).length} items)`}
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
                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-300 animate-fade-in"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100"
                            dangerouslySetInnerHTML={{
                              __html: highlightSearchTerm(scan.tracking, searchTerm)
                            }}
                          />
                          <button
                            onClick={() => copyToClipboard(scan.tracking)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatDate(scan.timestamp)}</span>
                            <span className="text-gray-300 dark:text-gray-600">at</span>
                            <span>{formatTime(scan.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Device:</span>
                            <span className="font-medium">{scan.deviceName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {scan.checked ? (
                          <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Checked</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-full text-sm">
                            <Circle className="w-4 h-4" />
                            <span>Pending</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchTerm.trim() && !isLoading ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                  <SearchIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  No results found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  No tracking numbers match <span className="font-mono font-semibold">"{searchTerm}"</span>
                </p>
              </div>
            ) : !searchTerm.trim() ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
                  <SearchIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Search Tracking Numbers
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Enter a tracking number to search for scanned parcels
                </p>
                <div className="text-sm text-gray-400 dark:text-gray-500">
                  <p className="flex items-center justify-center gap-2">
                    <span>💡 Quick search:</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md font-mono">Ctrl+K</kbd>
                    <span>or</span>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md font-mono">/</kbd>
                  </p>
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