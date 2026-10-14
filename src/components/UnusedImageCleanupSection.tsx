import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trash2,
  RefreshCw,
  HardDrive,
  Database,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Eye,
  X,
  FileCheck2,
  ExternalLink,
  ShieldCheck,
  Search,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { db, storage } from '../lib/firebase';
import {
  scanFirestoreActiveImages,
  scanFirebaseStorageImages,
  purgeOrphanStorageImages,
  deleteStorageImage,
  formatBytes,
  StorageImageItem,
  CleanupScanReport,
} from '../lib/storageCleanup';

interface UnusedImageCleanupSectionProps {
  isAdmin: boolean;
  onNotification?: (message: string, type: 'success' | 'error') => void;
}

export const UnusedImageCleanupSection: React.FC<UnusedImageCleanupSectionProps> = ({
  isAdmin,
  onNotification,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanReport, setScanReport] = useState<CleanupScanReport | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<'orphans' | 'used' | 'breakdown'>('orphans');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Modal states
  const [previewImage, setPreviewImage] = useState<StorageImageItem | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeProgress, setPurgeProgress] = useState<{
    completed: number;
    total: number;
    currentPath: string;
  } | null>(null);
  const [singleItemToPurge, setSingleItemToPurge] = useState<StorageImageItem | null>(null);

  // Execution scan function
  const runScan = useCallback(async () => {
    setIsScanning(true);
    setScanStep('1/2: Scanning Firestore collections (Leaderboard, Challengers, Warps, Users)...');

    try {
      // Step 1: Scan Firestore active image references
      const firestoreSummary = await scanFirestoreActiveImages(db);

      setScanStep('2/2: Cross-checking with Firebase Storage bucket...');
      // Step 2 & 3: Cross-check with Firebase Storage bucket
      const report = await scanFirebaseStorageImages(storage, firestoreSummary);

      setScanReport(report);
      setLastScanTime(new Date().toLocaleTimeString());

      // Auto-select all orphans for quick one-click cleanup
      const orphanPathSet = new Set(report.orphanImages.map((img) => img.fullPath));
      setSelectedPaths(orphanPathSet);

      if (report.orphanImages.length > 0) {
        onNotification?.(
          `Scan complete: Found ${report.orphanImages.length} unused image(s) (${formatBytes(report.orphanBytes)}) ready for cleanup.`,
          'success'
        );
      } else {
        onNotification?.(
          `Scan complete: All ${report.totalStorageFiles} storage files are in active use! No orphan images detected.`,
          'success'
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onNotification?.(`Cleanup scan failed: ${errorMsg}`, 'error');
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  }, [onNotification]);

  // Initial automatic scan when section mounts
  useEffect(() => {
    if (isAdmin && !scanReport && !isScanning) {
      runScan();
    }
  }, [isAdmin, scanReport, isScanning, runScan]);

  // Toggle selection of single image
  const toggleSelectImage = (fullPath: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(fullPath)) {
        next.delete(fullPath);
      } else {
        next.add(fullPath);
      }
      return next;
    });
  };

  // Select all or Deselect all orphans
  const toggleSelectAllOrphans = () => {
    if (!scanReport) return;
    if (selectedPaths.size === scanReport.orphanImages.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(scanReport.orphanImages.map((img) => img.fullPath)));
    }
  };

  // Perform purge of selected orphan images
  const executePurge = async () => {
    if (!scanReport) return;

    const targets = singleItemToPurge
      ? [singleItemToPurge]
      : scanReport.orphanImages.filter((img) => selectedPaths.has(img.fullPath));

    if (targets.length === 0) return;

    setIsPurging(true);
    setIsConfirmModalOpen(false);
    setPurgeProgress({ completed: 0, total: targets.length, currentPath: 'Starting purge...' });

    try {
      const result = await purgeOrphanStorageImages(storage, targets, (progress) => {
        setPurgeProgress(progress);
      });

      if (result.successCount > 0) {
        onNotification?.(
          `Successfully purged ${result.successCount} unused image(s), freeing ${formatBytes(result.freedBytes)} from Firebase Storage.`,
          'success'
        );
      }

      if (result.failureCount > 0) {
        onNotification?.(
          `${result.failureCount} file(s) could not be removed: ${result.errors[0]?.error || 'Unknown error'}`,
          'error'
        );
      }

      // Re-run scan to update UI with latest live state
      setSingleItemToPurge(null);
      await runScan();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onNotification?.(`Purge operation error: ${errorMsg}`, 'error');
    } finally {
      setIsPurging(false);
      setPurgeProgress(null);
    }
  };

  // Filtered lists based on search
  const filteredOrphans = useMemo(() => {
    if (!scanReport) return [];
    if (!searchQuery.trim()) return scanReport.orphanImages;
    const q = searchQuery.toLowerCase().trim();
    return scanReport.orphanImages.filter(
      (img) =>
        img.name.toLowerCase().includes(q) ||
        img.fullPath.toLowerCase().includes(q) ||
        img.folder.toLowerCase().includes(q)
    );
  }, [scanReport, searchQuery]);

  const filteredUsed = useMemo(() => {
    if (!scanReport) return [];
    if (!searchQuery.trim()) return scanReport.usedImages;
    const q = searchQuery.toLowerCase().trim();
    return scanReport.usedImages.filter(
      (img) =>
        img.name.toLowerCase().includes(q) ||
        img.fullPath.toLowerCase().includes(q) ||
        img.matchedReference?.collection.toLowerCase().includes(q) ||
        img.matchedReference?.docId.toLowerCase().includes(q)
    );
  }, [scanReport, searchQuery]);

  // Calculate selected total size
  const selectedSize = useMemo(() => {
    if (!scanReport) return 0;
    return scanReport.orphanImages
      .filter((img) => selectedPaths.has(img.fullPath))
      .reduce((sum, img) => sum + img.sizeBytes, 0);
  }, [scanReport, selectedPaths]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </span>
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide flex items-center gap-2">
                Unused Image Cleanup
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  Storage Optimizer
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Scans Firestore collections (<span className="text-emerald-400 font-medium">Leaderboard</span>,{' '}
              <span className="text-amber-400 font-medium">Challengers</span>,{' '}
              <span className="text-cyan-400 font-medium">Warps</span>,{' '}
              <span className="text-indigo-400 font-medium">Users</span>, and CMS), cross-checks against{' '}
              <span className="text-white font-medium">Firebase Storage</span>, and safely purges orphan image files to free up bucket quota.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isScanning || isPurging}
              onClick={runScan}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isScanning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-sm active:scale-95'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan Storage & Firestore'}</span>
            </button>

            <button
              type="button"
              disabled={
                isScanning ||
                isPurging ||
                !scanReport ||
                scanReport.orphanImages.length === 0 ||
                selectedPaths.size === 0
              }
              onClick={() => {
                setSingleItemToPurge(null);
                setIsConfirmModalOpen(true);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                !scanReport || scanReport.orphanImages.length === 0 || selectedPaths.size === 0
                  ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-900/30 active:scale-95'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                Delete Unused Images ({selectedPaths.size})
              </span>
            </button>
          </div>
        </div>

        {/* Live scanning progress bar */}
        {isScanning && (
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span className="font-mono text-emerald-400 flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {scanStep}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-1.5 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}

        {/* Purge in progress banner */}
        {isPurging && purgeProgress && (
          <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs">
            <div className="flex items-center justify-between text-rose-200 mb-1.5 font-semibold">
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400 animate-bounce" />
                Purging files from Firebase Storage...
              </span>
              <span className="font-mono">
                {purgeProgress.completed} / {purgeProgress.total}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden mb-1">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all duration-200"
                style={{
                  width: `${Math.round((purgeProgress.completed / purgeProgress.total) * 100)}%`,
                }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400 truncate">
              {purgeProgress.currentPath}
            </div>
          </div>
        )}
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Storage Files */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Storage Files</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {scanReport ? scanReport.totalStorageFiles : '—'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {scanReport ? formatBytes(scanReport.totalStorageBytes) : 'Scanning...'}
            </div>
          </div>
        </div>

        {/* Metric 2: Firestore Active Images */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Active in Firestore</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {scanReport ? scanReport.firestoreSummary.totalActiveImageRefs : '—'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Across {scanReport ? scanReport.firestoreSummary.totalDocsScanned : 0} docs
            </div>
          </div>
        </div>

        {/* Metric 3: Orphan / Unused Images */}
        <div className={`rounded-xl p-4 border flex flex-col justify-between ${
          scanReport && scanReport.orphanImages.length > 0
            ? 'bg-rose-950/20 border-rose-800/60'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={scanReport && scanReport.orphanImages.length > 0 ? 'text-rose-300 font-medium' : 'text-slate-400'}>
              Unused / Orphans
            </span>
            <AlertTriangle className={`w-4 h-4 ${scanReport && scanReport.orphanImages.length > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <div>
            <div className={`text-2xl font-bold font-mono ${
              scanReport && scanReport.orphanImages.length > 0 ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {scanReport ? scanReport.orphanImages.length : '—'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {scanReport ? `${formatBytes(scanReport.orphanBytes)} waste` : 'Safe to purge'}
            </div>
          </div>
        </div>

        {/* Metric 4: Reclaimable Space */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Selected to Free</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {formatBytes(selectedSize)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {selectedPaths.size} file(s) selected
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Tabs & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Navigation Tabs & Search */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('orphans')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'orphans'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Unused Images</span>
              {scanReport && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'orphans' ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {scanReport.orphanImages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('used')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'used'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Active Images</span>
              {scanReport && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'used' ? 'bg-black/30 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  {scanReport.usedImages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('breakdown')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'breakdown'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Collections Cross-Check</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename or path..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Unused / Orphan Images */}
        {activeTab === 'orphans' && (
          <div>
            {/* Table controls */}
            {scanReport && scanReport.orphanImages.length > 0 && (
              <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={toggleSelectAllOrphans}
                  className="flex items-center gap-2 text-slate-300 hover:text-white font-medium cursor-pointer"
                >
                  {selectedPaths.size === scanReport.orphanImages.length ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )}
                  <span>
                    {selectedPaths.size === scanReport.orphanImages.length ? 'Deselect All' : 'Select All'} ({scanReport.orphanImages.length})
                  </span>
                </button>

                <div className="text-[11px] font-mono text-slate-400">
                  Selected for purge:{' '}
                  <span className="text-rose-400 font-bold">{selectedPaths.size}</span> file(s) ({formatBytes(selectedSize)})
                </div>
              </div>
            )}

            {/* List / Table of Orphan Images */}
            {filteredOrphans.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-white">
                  {searchQuery ? 'No orphan images matching search query' : 'No Orphan Images Found!'}
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {searchQuery
                    ? 'Try clearing your search query to see all orphan files.'
                    : 'All images stored in Firebase Storage are currently mapped to active documents in Firestore (Leaderboards, Challengers, Warps, Users, etc.). Your storage bucket is clean!'}
                </p>
                {lastScanTime && (
                  <div className="text-[11px] font-mono text-slate-500">
                    Last scanned at {lastScanTime}
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="py-3 px-3 w-16">Preview</th>
                      <th className="py-3 px-4">Filename &amp; Storage Path</th>
                      <th className="py-3 px-4">Folder</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredOrphans.map((img) => {
                      const isSelected = selectedPaths.has(img.fullPath);
                      return (
                        <tr
                          key={img.fullPath}
                          className={`transition-colors hover:bg-slate-800/40 ${
                            isSelected ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectImage(img.fullPath)}
                              className="w-4 h-4 rounded border-slate-700 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-900 cursor-pointer"
                            />
                          </td>

                          {/* Thumbnail preview */}
                          <td className="py-3 px-3">
                            <div
                              onClick={() => setPreviewImage(img)}
                              className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer group relative flex items-center justify-center shrink-0"
                            >
                              {img.downloadUrl ? (
                                <img
                                  src={img.downloadUrl}
                                  alt={img.name}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                  onError={(e) => {
                                    // Fallback on broken image load
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <FolderOpen className="w-5 h-5 text-slate-600" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </td>

                          {/* Filename & full path */}
                          <td className="py-3 px-4 max-w-xs md:max-w-md">
                            <div className="font-semibold text-white truncate text-xs" title={img.name}>
                              {img.name}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400 truncate mt-0.5" title={img.fullPath}>
                              {img.fullPath}
                            </div>
                            {img.timeCreated && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Uploaded: {new Date(img.timeCreated).toLocaleDateString()}
                              </div>
                            )}
                          </td>

                          {/* Folder Tag */}
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300">
                              {img.folder}
                            </span>
                          </td>

                          {/* Size */}
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {formatBytes(img.sizeBytes)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Orphan (Unused)
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {img.downloadUrl && (
                                <a
                                  href={img.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                  title="Open original image"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSingleItemToPurge(img);
                                  setIsConfirmModalOpen(true);
                                }}
                                className="p-1.5 text-rose-400 hover:text-rose-200 rounded-lg hover:bg-rose-950/50 border border-transparent hover:border-rose-800 transition-colors cursor-pointer"
                                title="Purge this image file"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Used / Active Images */}
        {activeTab === 'used' && (
          <div>
            <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                These {scanReport ? scanReport.usedImages.length : 0} image files are actively referenced in Firestore and protected from deletion.
              </span>
            </div>

            {filteredUsed.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  {searchQuery ? 'No active images match your filter.' : 'No active storage image files detected.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3 w-16">Preview</th>
                      <th className="py-3 px-4">Filename &amp; Path</th>
                      <th className="py-3 px-4">Matched Firestore Doc</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Protection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredUsed.map((img) => (
                      <tr key={img.fullPath} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3">
                          <div
                            onClick={() => setPreviewImage(img)}
                            className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden cursor-pointer group relative flex items-center justify-center shrink-0"
                          >
                            {img.downloadUrl ? (
                              <img
                                src={img.downloadUrl}
                                alt={img.name}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              />
                            ) : (
                              <FolderOpen className="w-5 h-5 text-slate-600" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-xs md:max-w-md">
                          <div className="font-semibold text-white truncate text-xs" title={img.name}>
                            {img.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 truncate mt-0.5">
                            {img.fullPath}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {img.matchedReference ? (
                            <div className="space-y-0.5">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                                {img.matchedReference.collection}/{img.matchedReference.docId}
                              </span>
                              <div className="text-[10px] text-slate-500 font-mono">
                                field: {img.matchedReference.field}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Referenced in database</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-300">
                          {formatBytes(img.sizeBytes)}
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            In Active Use (Protected)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Collections Breakdown */}
        {activeTab === 'breakdown' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                Firestore Collections Scan Inspection
              </h3>
              <p className="text-xs text-slate-400">
                The scanner inspects all documents and nested fields across these collections to assemble the active image whitelist:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scanReport &&
                Object.entries(scanReport.firestoreSummary.collectionBreakdown).map(
                  ([colName, stats]) => {
                    const isKeyCollection = [
                      'leaderboards',
                      'challengers',
                      'warps',
                      'game_modes',
                      'users',
                    ].includes(colName);

                    return (
                      <div
                        key={colName}
                        className={`p-3.5 rounded-xl border flex items-center justify-between ${
                          isKeyCollection
                            ? 'bg-slate-950/90 border-emerald-800/40'
                            : 'bg-slate-950/50 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-xs text-white">
                              {colName}
                            </span>
                            {isKeyCollection && (
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                                Core
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {stats.docs} document(s) scanned
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-bold font-mono text-emerald-400">
                            {stats.images}
                          </div>
                          <div className="text-[10px] text-slate-500">active images</div>
                        </div>
                      </div>
                    );
                  }
                )}
            </div>

            {scanReport && scanReport.errors && scanReport.errors.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/50 text-xs text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Storage Notice
                </div>
                {scanReport.errors.map((msg, idx) => (
                  <div key={idx} className="font-mono text-[11px] text-amber-300">
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">
                Confirm Unused Image Deletion
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {singleItemToPurge ? (
                  <>
                    Are you sure you want to permanently delete{' '}
                    <span className="font-mono text-white font-medium">
                      {singleItemToPurge.name}
                    </span>{' '}
                    ({formatBytes(singleItemToPurge.sizeBytes)}) from Firebase Storage?
                  </>
                ) : (
                  <>
                    Are you sure you want to permanently delete{' '}
                    <span className="font-bold text-rose-400 font-mono">
                      {selectedPaths.size}
                    </span>{' '}
                    unused image(s) ({formatBytes(selectedSize)}) from Firebase Storage?
                  </>
                )}
              </p>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 space-y-1">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Safety Guarantee:
              </div>
              <p className="text-slate-400">
                These files have zero references in your Firestore database collections (<span className="text-emerald-400">Leaderboard</span>, <span className="text-amber-400">Challengers</span>, <span className="text-cyan-400">Warps</span>, <span className="text-indigo-400">Users</span>). Deleting them will free up storage without affecting your live website.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setSingleItemToPurge(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePurge}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-lg shadow-rose-950/50 transition-all cursor-pointer active:scale-95"
              >
                Yes, Purge Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl relative cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="truncate pr-4">
                <h4 className="text-sm font-bold text-white truncate">{previewImage.name}</h4>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  {previewImage.fullPath}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image display */}
            <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
              {previewImage.downloadUrl ? (
                <img
                  src={previewImage.downloadUrl}
                  alt={previewImage.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-slate-500 text-xs font-mono">Image preview unavailable</div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                <span>Size: <strong className="text-white">{formatBytes(previewImage.sizeBytes)}</strong></span>
                {previewImage.timeCreated && (
                  <span>Created: <strong className="text-white">{new Date(previewImage.timeCreated).toLocaleDateString()}</strong></span>
                )}
                <span>
                  Status:{' '}
                  <strong className={previewImage.isOrphan ? 'text-rose-400' : 'text-emerald-400'}>
                    {previewImage.isOrphan ? 'Unused Orphan' : 'In Active Use'}
                  </strong>
                </span>
              </div>

              {previewImage.downloadUrl && (
                <a
                  href={previewImage.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center gap-1.5 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Image</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
