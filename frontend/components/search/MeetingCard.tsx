import Link from "next/link";
import { Calendar, Clock, ChevronRight } from "lucide-react";

export type MeetingSummaryMatch = {
  id: string;
  title: string;
  date: string;
  duration: number;
  short_summary: string;
};

type MeetingCardProps = {
  meeting: MeetingSummaryMatch;
  searchQuery: string;
};

export function MeetingCard({ meeting, searchQuery }: MeetingCardProps) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-all group">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              <Link href={`/meetings/${meeting.id}`}>
                {meeting.title}
              </Link>
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(meeting.date).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {Math.floor(meeting.duration / 60)}m {meeting.duration % 60}s
              </div>
            </div>
          </div>
          <Link 
            href={`/meetings/${meeting.id}`}
            className="p-2 bg-slate-50 dark:bg-slate-900 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 rounded-xl transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            <Highlight text={meeting.short_summary} highlight={searchQuery} />
          </p>
        </div>
      </div>
    </div>
  );
}

function Highlight({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim() || !text) return <>{text}</>;
  
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
