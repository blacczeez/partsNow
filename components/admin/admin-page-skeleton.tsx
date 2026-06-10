interface AdminPageSkeletonProps {
  statCards?: number;
  tableColumns?: number;
  tableRows?: number;
  showFilters?: boolean;
}

export function AdminPageSkeleton({
  statCards = 0,
  tableColumns = 4,
  tableRows = 5,
  showFilters = false,
}: AdminPageSkeletonProps) {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-28 animate-pulse rounded-button bg-slate-200" />
      </div>

      {showFilters && (
        <div className="mb-4 h-20 animate-pulse rounded-card border border-slate-200 bg-white" />
      )}

      {statCards > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: statCards }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-card border border-slate-200 bg-white"
            />
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: tableColumns }).map((_, index) => (
              <div key={index} className="h-4 flex-1 animate-pulse rounded bg-slate-200" />
            ))}
          </div>
        </div>
        {Array.from({ length: tableRows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b border-slate-100 px-4 py-3 last:border-0">
            <div className="flex gap-4">
              {Array.from({ length: tableColumns }).map((_, colIndex) => (
                <div key={colIndex} className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
