import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Calendar, User as UserIcon } from "lucide-react";

export type SearchResult = {
  id: string; // chunk id
  meeting_id: string;
  meeting_title: string;
  meeting_date: string;
  speaker_name: string;
  start_time: number;
  chunk_text: string;
  final_score: number;
};

type ResultGroupProps = {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  results: SearchResult[];
  searchQuery: string;
  focusedResultId: string | null;
  onFocusResult: (id: string) => void;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export function ResultGroup({
  meetingId,
  meetingTitle,
  meetingDate,
  results,
  searchQuery,
  focusedResultId,
  onFocusResult
}: ResultGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6 transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-[#111111]/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-4">
          <div className="text-slate-400">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Link href={`/meetings/${meetingId}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors" onClick={(e) => e.stopPropagation()}>
                {meetingTitle}
              </Link>
            </h3>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(meetingDate).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
              })}
              <span className="mx-1">•</span>
              <span className="font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs">
                {results.length} matches
              </span>
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {results.map((result) => {
            const isFocused = focusedResultId === result.id;
            
            return (
              <div 
                key={result.id}
                id={`result-${result.id}`}
                className={`p-6 transition-colors ${isFocused ? 'bg-blue-50/50 dark:bg-blue-900/20 ring-inset ring-2 ring-blue-500' : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/20'}`}
                onMouseEnter={() => onFocusResult(result.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>{result.speaker_name}</span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {formatTime(result.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2" title={`Relevance score: ${(result.final_score * 100).toFixed(0)}%`}>
                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(0, result.final_score * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
                  <Highlight text={result.chunk_text} highlight={searchQuery} />
                </p>
                
                <div className="mt-4 flex justify-end">
                  <Link 
                    href={`/meetings/${result.meeting_id}?time=${result.start_time}`}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    Jump to transcript <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Highlight({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;
  
  // Extract all query terms, escape them, and join into a regex
  const terms = highlight.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return <>{text}</>;

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexPattern = terms.map(escapeRegExp).join('|');
  const regex = new RegExp(`(${regexPattern})`, 'gi');
  
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <strong key={i} className="font-bold text-slate-900 dark:text-white bg-amber-200/50 dark:bg-amber-500/20 px-0.5 rounded-sm">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
