import { useMemo } from "react";

type SearchAnalyticsProps = {
  query: string;
  resultsCount: number;
  meetingsCount: number;
};

export function SearchAnalytics({ query, resultsCount, meetingsCount }: SearchAnalyticsProps) {
  const queryTerms = useMemo(() => {
    if (!query.trim()) return [];
    return Array.from(new Set(query.trim().split(/\s+/).filter(Boolean)));
  }, [query]);

  if (!query.trim() && resultsCount === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {queryTerms.length > 0 && (
          <>
            <span className="text-sm text-slate-500 dark:text-slate-400 mr-1">Expanded terms:</span>
            {queryTerms.map((term, idx) => (
              <span 
                key={idx}
                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium border border-blue-100 dark:border-blue-800"
              >
                {term}
              </span>
            ))}
          </>
        )}
      </div>

      <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
        Found <span className="font-semibold text-slate-900 dark:text-slate-200">{resultsCount}</span> results across <span className="font-semibold text-slate-900 dark:text-slate-200">{meetingsCount}</span> meetings
      </div>
    </div>
  );
}
