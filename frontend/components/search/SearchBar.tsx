import { Search, X, Loader2 } from "lucide-react";
import { RefObject } from "react";

type SearchBarProps = {
  query: string;
  setQuery: (val: string) => void;
  isLoading: boolean;
  meetingIdFilter: string;
  setMeetingIdFilter: (val: string) => void;
  inputRef: RefObject<HTMLInputElement>;
};

export function SearchBar({
  query,
  setQuery,
  isLoading,
  meetingIdFilter,
  setMeetingIdFilter,
  inputRef,
}: SearchBarProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="relative flex items-center shadow-sm rounded-2xl bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
        <div className="pl-5 pr-3 text-slate-400">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isLoading ? "Searching across all meetings..." : "Search transcripts and action items (Press '/' to focus)"}
          className="flex-1 w-full py-4 px-2 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-lg"
        />

        {query && (
          <button
            onClick={() => setQuery("")}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="pr-2 border-l border-slate-200 dark:border-slate-800 pl-2">
          <select
            value={meetingIdFilter}
            onChange={(e) => setMeetingIdFilter(e.target.value)}
            className="bg-transparent text-sm text-slate-500 dark:text-slate-400 focus:outline-none py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer max-w-[200px] truncate appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
          >
            <option value="">All Meetings</option>
            {/* In a real app, these would be populated from an API. We'll use mock or pass down if needed. For now, testing filter logic. */}
            <option value="123">Q3 Planning Session</option>
            <option value="124">Engineering Sync</option>
          </select>
        </div>
      </div>
    </div>
  );
}
