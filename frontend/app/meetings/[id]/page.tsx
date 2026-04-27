"use client";

import { useQuery } from "react-query";
import axios from "axios";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Search, Calendar, Clock, User as UserIcon } from "lucide-react";

import { StatusBanner, MeetingSkeleton } from "../../../components/meeting/StatusBanner";
import { TranscriptViewer } from "../../../components/meeting/TranscriptViewer";
import { ActionItems } from "../../../components/meeting/ActionItems";

const fetchMeeting = async (id: string) => {
  const { data } = await axios.get(`/api/meetings/${id}`);
  return data;
};

export default function MeetingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [searchQuery, setSearchQuery] = useState("");

  const { data: meeting, isLoading, isError } = useQuery(
    ['meeting', id],
    () => fetchMeeting(id),
    {
      refetchInterval: (data) => {
        if (!data) return 5000;
        return (data.status === 'pending' || data.status === 'transcribing') ? 5000 : false;
      },
    }
  );

  const formatDuration = (seconds: number) => {
    if (!seconds) return "Unknown duration";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading && !meeting) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <MeetingSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Error loading meeting</h2>
          <p className="text-slate-500">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const isProcessed = meeting?.status === 'processed';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="space-y-6">
          <StatusBanner status={meeting?.status || 'pending'} />

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {meeting?.title || "Untitled Meeting"}
            </h1>
            
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(meeting?.created_at || meeting?.date)}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatDuration(meeting?.duration)}
              </div>
              <div className="flex items-center gap-1.5">
                <UserIcon className="w-4 h-4" />
                Uploaded by {meeting?.uploaded_by?.name || "Unknown"}
              </div>
            </div>
          </div>
        </div>

        {!isProcessed ? (
          <MeetingSkeleton />
        ) : (
          <>
            {/* Summary Card */}
            <div className="bg-white dark:bg-[#111111] rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Meeting Summary</h2>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {meeting?.short_summary}
                </p>
                {meeting?.detailed_summary && (
                  <details className="mt-6 group cursor-pointer">
                    <summary className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 transition-colors">
                      View detailed summary
                    </summary>
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                      {meeting.detailed_summary}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Main Content: Transcript + Action Items */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Transcript Column */}
              <div className="lg:col-span-2 space-y-4">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-xl border-0 py-3 pl-11 pr-4 text-slate-900 dark:text-white dark:bg-[#111111] shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all"
                    placeholder="Search transcript..."
                  />
                </div>

                <TranscriptViewer 
                  meetingId={id} 
                  chunks={meeting?.transcript_chunks || []} 
                  searchQuery={searchQuery}
                />
              </div>

              {/* Action Items Column */}
              <div className="lg:col-span-1">
                <ActionItems 
                  meetingId={id}
                  items={meeting?.action_items || []} 
                />
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
