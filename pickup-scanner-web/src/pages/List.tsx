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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-lg font-semibold">All Scans ({filteredScans.length})</h1>
          <button className="text-gray-400">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Search and filters */}
        <div className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tracking numbers..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showChecked}
                onChange={(e) => setShowChecked(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Checked</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showUnchecked}
                onChange={(e) => setShowUnchecked(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Unchecked</span>
            </label>
          </div>
        </div>
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <span>{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSelectedChecked(true)}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              Check
            </button>
            <button
              onClick={() => toggleSelectedChecked(false)}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Circle className="w-4 h-4" />
              Uncheck
            </button>
            <button
              onClick={() => deleteSelectedMutation.mutate(Array.from(selectedIds))}
              disabled={deleteSelectedMutation.isPending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={clearSelection}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Scan list */}
      <div className="p-4">
        {filteredScans.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              {searchTerm ? 'No scans match your search' : 'No scans yet'}
            </div>
            <Link
              to="/scan"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Start Scanning
            </Link>
          </div>
        ) : (
          <>
            {/* Select all button */}
            <div className="mb-4 flex justify-between items-center">
              <button
                onClick={selectedIds.size === filteredScans.length ? clearSelection : selectAll}
                className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
              >
                {selectedIds.size === filteredScans.length ? 'Deselect All' : 'Select All'}
              </button>
              <div className="text-sm text-gray-500">
                Showing {filteredScans.length} of {allScans.length} scans
              </div>
            </div>

            {/* Grouped scans */}
            {Object.entries(groupedScans)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, scans]) => (
                <div key={date} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 sticky top-20 bg-gray-50 dark:bg-gray-900 py-1">
                    {date} ({scans.length})
                  </h3>
                  <div className="space-y-2">
                    {scans.map((scan) => (
                      <div
                        key={scan.id}
                        className={`bg-white dark:bg-gray-800 rounded-lg p-4 border transition-all ${
                          selectedIds.has(scan.id!)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Selection checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedIds.has(scan.id!)}
                            onChange={() => toggleSelection(scan.id!)}
                            className="rounded"
                          />

                          {/* Checked status */}
                          <button
                            onClick={() => toggleCheckedMutation.mutate({ id: scan.id!, checked: scan.checked })}
                            className={`flex-shrink-0 ${
                              scan.checked 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {scan.checked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </button>

                          {/* Tracking info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-lg font-semibold truncate">
                              {scan.tracking}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <span>{formatTime(scan.timestamp)}</span>
                              <span>•</span>
                              <span>{scan.deviceName}</span>
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