import { Loader2, CheckCircle2, Clock } from "lucide-react";

type StatusBannerProps = {
  status: 'pending' | 'transcribing' | 'processed' | 'failed';
};

export function StatusBanner({ status }: StatusBannerProps) {
  if (status === 'processed') return null;

  const getStatusContent = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5 animate-pulse text-blue-500" />,
          title: "Waiting to process...",
          description: "Your meeting is queued for processing.",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      case 'transcribing':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin text-amber-500" />,
          title: "Transcribing and Generating Intelligence...",
          description: "This might take a few minutes depending on the meeting length.",
          bgColor: "bg-amber-50 dark:bg-amber-900/20",
          borderColor: "border-amber-200 dark:border-amber-800",
        };
      case 'failed':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-red-500" />,
          title: "Processing Failed",
          description: "There was an error processing this meeting.",
          bgColor: "bg-red-50 dark:bg-red-900/20",
          borderColor: "border-red-200 dark:border-red-800",
        };
      default:
        return null;
    }
  };

  const content = getStatusContent();
  if (!content) return null;

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${content.bgColor} ${content.borderColor} mb-6 transition-all duration-300`}>
      <div className="mt-0.5">{content.icon}</div>
      <div>
        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">{content.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{content.description}</p>
      </div>
    </div>
  );
}

export function MeetingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="flex gap-4">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
      </div>

      {/* Summary Skeleton */}
      <div className="h-32 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
          <div className="h-20 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-20 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-20 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="space-y-4">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
          <div className="h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
