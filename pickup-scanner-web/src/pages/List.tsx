import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  Trash2,
  Check,
  X,
  CheckCircle2,
  Circle,
  Search,
} from 'lucide-react';
import { scanOperations } from '../db/dexie';
import { formatTime, groupByDate } from '../lib/normalize';
import { PageLayout } from '../components/PageLayout';

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
    } catch {
      toast.error('Failed to update scans');
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="All scans" subtitle="Loading your history" backTo="/">
        <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">Loading…</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="All scans"
      subtitle={`${filteredScans.length} visible • ${allScans.length} total`}
      backTo="/"
    >
      <div className="space-y-6 pb-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-colors dark:border-slate-800/60 dark:bg-slate-900/70">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tracking numbers or devices"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400"
            />
          </div>
          <div className="mt-4 flex gap-4 text-sm text-slate-500 dark:text-slate-400">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showChecked}
                onChange={(e) => setShowChecked(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
              />
              <span className="font-medium">Show checked</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showUnchecked}
                onChange={(e) => setShowUnchecked(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
              />
              <span className="font-medium">Show pending</span>
            </label>
          </div>
        </section>

        {selectedIds.size > 0 && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">{selectedIds.size} selected</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toggleSelectedChecked(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  <CheckCircle2 className="h-4 w-4" /> Check
                </button>
                <button
                  onClick={() => toggleSelectedChecked(false)}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Circle className="h-4 w-4" /> Uncheck
                </button>
                <button
                  onClick={() => deleteSelectedMutation.mutate(Array.from(selectedIds))}
                  disabled={deleteSelectedMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-400"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
                <button
                  onClick={clearSelection}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 hover:text-blue-500 dark:text-blue-300"
                >
                  <X className="h-4 w-4" /> Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredScans.length === 0 ? (
          <EmptyState searchTerm={searchTerm} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <button
                onClick={selectedIds.size === filteredScans.length ? clearSelection : selectAll}
                className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {selectedIds.size === filteredScans.length ? 'Deselect all' : 'Select all'}
              </button>
              <span>
                Showing {filteredScans.length} of {allScans.length}
              </span>
            </div>

            {Object.entries(groupedScans)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, scans]) => (
                <section key={date} className="space-y-3">
                  <header className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {date} • {scans.length}
                  </header>
                  <div className="space-y-3">
                    {scans.map((scan) => (
                      <article
                        key={scan.id}
                        className={`rounded-2xl border p-4 shadow-sm transition hover:border-blue-200 dark:border-slate-800/70 dark:hover:border-blue-500/30 ${
                          selectedIds.has(scan.id!)
                            ? 'border-blue-400 bg-blue-50/70 dark:bg-blue-500/10'
                            : 'border-slate-200/80 bg-white dark:bg-slate-900/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(scan.id!)}
                            onChange={() => toggleSelection(scan.id!)}
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                          />
                          <button
                            onClick={() => toggleCheckedMutation.mutate({ id: scan.id!, checked: scan.checked })}
                            className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                              scan.checked
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'border-slate-200 bg-slate-100 text-slate-400 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-300'
                            }`}
                            aria-label={scan.checked ? 'Mark as unchecked' : 'Mark as checked'}
                          >
                            {scan.checked ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100">
                              {scan.tracking}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-medium">{formatTime(scan.timestamp)}</span>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <span className="truncate">{scan.deviceName}</span>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function EmptyState({ searchTerm }: { searchTerm: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Search className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {searchTerm ? 'No matches found' : 'No scans yet'}
      </h2>
      <p className="mt-2 text-sm">
        {searchTerm ? 'Try a different keyword or clear the filters.' : 'Start scanning to see items appear here.'}
      </p>
      <Link
        to="/scan"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
      >
        <Check className="h-4 w-4" />
        Open scanner
      </Link>
    </section>
  );
}