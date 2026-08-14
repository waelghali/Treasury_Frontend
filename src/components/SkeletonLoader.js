import React from 'react';

/**
 * SkeletonLoader component suite providing 100% reversible, elegant
 * shimmer loading states for tables, metric cards, and detail views.
 */

// Basic shimmering block
export const SkeletonBlock = ({ width = 'w-full', height = 'h-4', className = '' }) => (
  <div className={`bg-slate-200 dark:bg-slate-700/60 rounded animate-pulse ${width} ${height} ${className}`} />
);

// Table Skeleton (Simulates header row + body rows)
export const SkeletonTable = ({ rows = 5, cols = 5, className = '' }) => (
  <div className={`w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm ${className}`}>
    {/* Table Header */}
    <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      {Array.from({ length: cols }).map((_, idx) => (
        <div key={idx} className="flex-1 px-3">
          <SkeletonBlock height="h-3.5" width="w-20" />
        </div>
      ))}
    </div>
    {/* Table Rows */}
    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="px-6 py-4 flex items-center justify-between gap-4">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div key={cIdx} className="flex-1 px-3">
              <SkeletonBlock
                height="h-4"
                width={cIdx === 0 ? 'w-32' : cIdx === cols - 1 ? 'w-16' : 'w-24'}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Metric Cards Skeleton (Simulates stat cards grid)
export const SkeletonCards = ({ count = 3, className = '' }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${Math.min(count, 4)} gap-4 ${className}`}>
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonBlock width="w-24" height="h-3.5" />
          <SkeletonBlock width="w-8" height="h-8" className="rounded-full" />
        </div>
        <SkeletonBlock width="w-36" height="h-7" />
        <SkeletonBlock width="w-20" height="h-3" />
      </div>
    ))}
  </div>
);

// Detail Page Skeleton
export const SkeletonDetails = ({ className = '' }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm ${className}`}>
    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
      <div className="space-y-2">
        <SkeletonBlock width="w-48" height="h-6" />
        <SkeletonBlock width="w-32" height="h-4" />
      </div>
      <SkeletonBlock width="w-24" height="h-9" className="rounded-xl" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SkeletonBlock height="h-16" className="rounded-xl" />
      <SkeletonBlock height="h-16" className="rounded-xl" />
      <SkeletonBlock height="h-16" className="rounded-xl" />
    </div>
    <div className="space-y-3 pt-4">
      <SkeletonBlock width="w-full" height="h-4" />
      <SkeletonBlock width="w-5/6" height="h-4" />
      <SkeletonBlock width="w-2/3" height="h-4" />
    </div>
  </div>
);

export default SkeletonTable;
