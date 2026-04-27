import { useState, useMemo } from "react";
import { User } from "lucide-react";
import { SpeakerRenameModal } from "./SpeakerRenameModal";

export type TranscriptChunk = {
  id: string;
  speaker_id: string;
  speaker_label: string;
  display_name?: string;
  text: string;
  start_time: number;
  end_time: number;
};

type TranscriptViewerProps = {
  meetingId: string;
  chunks: TranscriptChunk[];
  searchQuery?: string;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export function TranscriptViewer({ meetingId, chunks, searchQuery = "" }: TranscriptViewerProps) {
  const [editingSpeaker, setEditingSpeaker] = useState<{ id: string; name: string } | null>(null);

  const highlightedChunks = useMemo(() => {
    if (!searchQuery.trim()) return chunks;
    
    const query = searchQuery.toLowerCase();
    return chunks.map(chunk => ({
      ...chunk,
      matches: chunk.text.toLowerCase().includes(query)
    }));
  }, [chunks, searchQuery]);

  return (
    <div className="bg-white dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[600px] shadow-sm">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#111111]/50 rounded-t-2xl">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          Transcript
        </h2>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {chunks?.length || 0} segments
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {highlightedChunks?.map((chunk, i) => {
          const isMatch = 'matches' in chunk && chunk.matches;
          const speakerName = chunk.display_name || chunk.speaker_label || `Speaker ${chunk.speaker_id}`;
          
          return (
            <div 
              key={chunk.id || i} 
              className={`group flex gap-4 transition-colors ${isMatch ? 'bg-blue-50/50 dark:bg-blue-900/10 p-2 -mx-2 rounded-xl' : ''}`}
            >
              <div className="w-16 flex-shrink-0 text-right pt-1">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 font-mono">
                  {formatTime(chunk.start_time)}
                </span>
              </div>
              
              <div className="flex-1">
                <button
                  onClick={() => setEditingSpeaker({ id: chunk.speaker_id, name: speakerName })}
                  className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mb-1"
                >
                  <User className="w-3.5 h-3.5" />
                  {speakerName}
                </button>
                
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
                  {searchQuery.trim() && isMatch ? (
                    <Highlight text={chunk.text} highlight={searchQuery} />
                  ) : (
                    chunk.text
                  )}
                </p>
              </div>
            </div>
          );
        })}
        {(!chunks || chunks.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <p>No transcript available.</p>
          </div>
        )}
      </div>

      {editingSpeaker && (
        <SpeakerRenameModal
          isOpen={!!editingSpeaker}
          onClose={() => setEditingSpeaker(null)}
          meetingId={meetingId}
          speakerId={editingSpeaker.id}
          currentName={editingSpeaker.name}
        />
      )}
    </div>
  );
}

function Highlight({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;
  
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 dark:bg-amber-900/50 text-inherit rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
