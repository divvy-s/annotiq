"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "react-query";
import axios from "axios";
import { SearchBar } from "../../components/search/SearchBar";
import { SearchAnalytics } from "../../components/search/SearchAnalytics";
import { ResultGroup, SearchResult } from "../../components/search/ResultGroup";
import { MeetingCard, MeetingSummaryMatch } from "../../components/search/MeetingCard";
import { useDebounce } from "../../hooks/useDebounce";

const fetchChunks = async (q: string, meetingId: string) => {
  if (!q.trim()) return [];
  const url = `/api/search?q=${encodeURIComponent(q)}${meetingId ? `&meeting_id=${meetingId}` : ''}`;
  const { data } = await axios.get(url);
  return data;
};

const fetchMeetings = async (q: string) => {
  if (!q.trim()) return [];
  const url = `/api/search/meetings?q=${encodeURIComponent(q)}`;
  const { data } = await axios.get(url);
  return data;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [meetingIdFilter, setMeetingIdFilter] = useState("");
  const debouncedQuery = useDebounce(query, 400);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [focusedResultId, setFocusedResultId] = useState<string | null>(null);

  const { data: chunks = [], isFetching: isFetchingChunks } = useQuery<SearchResult[]>(
    ['search', 'chunks', debouncedQuery, meetingIdFilter],
    () => fetchChunks(debouncedQuery, meetingIdFilter),
    { enabled: debouncedQuery.trim().length > 0 }
  );

  const { data: meetings = [], isFetching: isFetchingMeetings } = useQuery<MeetingSummaryMatch[]>(
    ['search', 'meetings', debouncedQuery],
    () => fetchMeetings(debouncedQuery),
    { enabled: debouncedQuery.trim().length > 0 && !meetingIdFilter }
  );

  const isLoading = (isFetchingChunks || isFetchingMeetings) && debouncedQuery !== "";
  const isSearchEmpty = debouncedQuery.trim().length === 0;
  
  // Group chunks by meeting
  const groupedChunks = useMemo(() => {
    if (!chunks || chunks.length === 0) return [];
    
    const groups: Record<string, { meeting: { id: string; title: string; date: string }, results: SearchResult[] }> = {};
    
    chunks.forEach(chunk => {
      if (!groups[chunk.meeting_id]) {
        groups[chunk.meeting_id] = {
          meeting: {
            id: chunk.meeting_id,
            title: chunk.meeting_title,
            date: chunk.meeting_date
          },
          results: []
        };
      }
      groups[chunk.meeting_id].results.push(chunk);
    });
    
    return Object.values(groups);
  }, [chunks]);

  const allResultIds = useMemo(() => {
    return chunks.map(c => c.id);
  }, [chunks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search bar on '/'
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Clear search on Esc
      if (e.key === 'Escape') {
        if (query) {
          setQuery("");
        } else {
          searchInputRef.current?.blur();
        }
      }

      // Arrow navigation
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && chunks.length > 0) {
        e.preventDefault();
        setFocusedResultId((prev) => {
          if (!prev) return e.key === 'ArrowDown' ? allResultIds[0] : allResultIds[allResultIds.length - 1];
          const currentIndex = allResultIds.indexOf(prev);
          if (currentIndex === -1) return allResultIds[0];
          
          let nextIndex;
          if (e.key === 'ArrowDown') {
            nextIndex = currentIndex + 1 >= allResultIds.length ? 0 : currentIndex + 1;
          } else {
            nextIndex = currentIndex - 1 < 0 ? allResultIds.length - 1 : currentIndex - 1;
          }
          
          // Scroll into view logic could be added here
          const element = document.getElementById(`result-${allResultIds[nextIndex]}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          
          return allResultIds[nextIndex];
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, allResultIds, chunks.length]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Semantic Search
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Search across your meetings, transcripts, and action items instantly.
          </p>
        </div>

        <SearchBar
          query={query}
          setQuery={setQuery}
          isLoading={isLoading}
          meetingIdFilter={meetingIdFilter}
          setMeetingIdFilter={setMeetingIdFilter}
          inputRef={searchInputRef}
        />

        {!isSearchEmpty && (
          <SearchAnalytics
            query={debouncedQuery}
            resultsCount={chunks.length + meetings.length}
            meetingsCount={groupedChunks.length + (meetingIdFilter ? 0 : meetings.length)}
          />
        )}

        <div className="mt-8">
          {isSearchEmpty ? (
            <div className="text-center py-20 px-6 bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Ready to search</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Start typing to explore transcripts and meeting summaries.
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
              <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full"></div>
            </div>
          ) : chunks.length === 0 && meetings.length === 0 ? (
            <div className="text-center py-20 px-6 bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm" data-testid="empty-state">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">No results found</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Try broader terms or removing your meeting filter.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              
              {meetings.length > 0 && !meetingIdFilter && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                    Meeting Summaries
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {meetings.map((meeting) => (
                      <MeetingCard key={meeting.id} meeting={meeting} searchQuery={debouncedQuery} />
                    ))}
                  </div>
                </div>
              )}

              {groupedChunks.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                    Transcript Matches
                  </h2>
                  <div className="space-y-6">
                    {groupedChunks.map((group) => (
                      <ResultGroup
                        key={group.meeting.id}
                        meetingId={group.meeting.id}
                        meetingTitle={group.meeting.title}
                        meetingDate={group.meeting.date}
                        results={group.results}
                        searchQuery={debouncedQuery}
                        focusedResultId={focusedResultId}
                        onFocusResult={setFocusedResultId}
                      />
                    ))}
                  </div>
                </div>
              )}
              
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
