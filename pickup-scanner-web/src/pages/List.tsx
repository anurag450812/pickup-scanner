import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Trash2, 
  Check, 
  X, 
  CheckCircle2, 
  Circle,
  MoreVertical,
  Search
} from 'lucide-react';
import { scanOperations } from '../db/dexie';
import { formatTime, groupByDate } from '../lib/normalize';

export default function List() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showChecked, setShowChecked] = useState(true);
  const [showUnchecked, setShowUnchecked] = useState(true);

  const queryClient = useQueryClient();

  // Get all scans
  const { data: allScans = [], isLoading } = useQuery({
    queryKey: ['allScans'],
    queryFn: scanOperations.getAllScans
  });

  // Filter scans based on search and visibility settings
  const filteredScans = useMemo(() => {
    let scans = allScans;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      scans = scans.filter(scan => 
        scan.tracking.toLowerCase().includes(term) ||
        scan.deviceName.toLowerCase().includes(term)
      );
    }

    // Filter by checked status
    scans = scans.filter(scan => {
      if (!showChecked && scan.checked) return false;
      if (!showUnchecked && !scan.checked) return false;
      return true;
    });

    return scans;
  }, [allScans, searchTerm, showChecked, showUnchecked]);

  // Group scans by date
  const groupedScans = useMemo(() => {
    return groupByDate(filteredScans);
  }, [filteredScans]);

  // Toggle scan checked status
  const toggleCheckedMutation = useMutation({
    mutationFn: async ({ id, checked }: { id: number; checked: boolean }) => {
      await scanOperations.updateScanChecked(id, !checked);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allScans'] });
      queryClient.invalidateQueries({ queryKey: ['homeStats'] });
    },
    onError: () => {
      toast.error('Failed to update scan');
    }
  });

  // Delete selected scans
  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await scanOperations.deleteScans(ids);
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['allScans'] });
      queryClient.invalidateQueries({ queryKey: ['homeStats'] });
      toast.success('Scans deleted');
    },
    onError: () => {
      toast.error('Failed to delete scans');
    }
  });

  // Toggle selection
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all visible scans
  const selectAll = () => {
    const allIds = filteredScans.map(scan => scan.id!);
    setSelectedIds(new Set(allIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Toggle all selected scans checked status
  const toggleSelectedChecked = async (checked: boolean) => {
    const promises = Array.from(selectedIds).map(id => 
      scanOperations.updateScanChecked(id, checked)
    );
    
    try {
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['allScans'] });
      queryClient.invalidateQueries({ queryKey: ['homeStats'] });
      toast.success(`Marked ${selectedIds.size} scans as ${checked ? 'checked' : 'unchecked'}`);
    } catch (error) {
      toast.error('Failed to update scans');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading scans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header with modern styling */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10 shadow-soft">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            All Scans ({filteredScans.length})
          </h1>
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Search and filters with modern design */}
        <div className="p-4 space-y-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tracking numbers..."
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={showChecked}
                onChange={(e) => setShowChecked(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Checked</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={showUnchecked}
                onChange={(e) => setShowUnchecked(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Unchecked</span>
            </label>
          </div>
        </div>
      </div>

      {/* Selection bar with modern design */}
      {selectedIds.size > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between shadow-lg animate-slide-down">
          <span className="font-semibold">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSelectedChecked(true)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              Check
            </button>
            <button
              onClick={() => toggleSelectedChecked(false)}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Circle className="w-4 h-4" />
              Uncheck
            </button>
            <button
              onClick={() => deleteSelectedMutation.mutate(Array.from(selectedIds))}
              disabled={deleteSelectedMutation.isPending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={clearSelection}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Scan list with modern cards */}
      <div className="p-4">
        {filteredScans.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <div className="text-gray-500 dark:text-gray-400 mb-6 text-lg">
              {searchTerm ? 'No scans match your search' : 'No scans yet'}
            </div>
            <Link
              to="/scan"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <Check className="w-5 h-5" />
              Start Scanning
            </Link>
          </div>
        ) : (
          <>
            {/* Select all button */}
            <div className="mb-4 flex justify-between items-center">
              <button
                onClick={selectedIds.size === filteredScans.length ? clearSelection : selectAll}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline transition-colors"
              >
                {selectedIds.size === filteredScans.length ? 'Deselect All' : 'Select All'}
              </button>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {filteredScans.length} of {allScans.length} scans
              </div>
            </div>

            {/* Grouped scans with modern design */}
            {Object.entries(groupedScans)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, scans]) => (
                <div key={date} className="mb-6 animate-fade-in">
                  <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-3 sticky top-32 bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-900 dark:to-transparent py-2 backdrop-blur-sm">
                    {date} <span className="text-gray-400 dark:text-gray-500">({scans.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {scans.map((scan) => (
                      <div
                        key={scan.id}
                        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 transition-all duration-300 hover:shadow-lg ${
                          selectedIds.has(scan.id!)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-[1.02]'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Selection checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedIds.has(scan.id!)}
                            onChange={() => toggleSelection(scan.id!)}
                            className="w-5 h-5 rounded-md border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer transition-all"
                          />

                          {/* Checked status button */}
                          <button
                            onClick={() => toggleCheckedMutation.mutate({ id: scan.id!, checked: scan.checked })}
                            className={`flex-shrink-0 transition-all duration-200 hover:scale-110 ${
                              scan.checked 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500'
                            }`}
                          >
                            {scan.checked ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                          </button>

                          {/* Tracking info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-base font-bold truncate text-gray-900 dark:text-gray-100">
                              {scan.tracking}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                              <span className="font-medium">{formatTime(scan.timestamp)}</span>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span className="truncate">{scan.deviceName}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}