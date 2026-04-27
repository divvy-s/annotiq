import { useMutation, useQueryClient } from "react-query";
import axios from "axios";
import { CheckSquare, Square, Calendar, User as UserIcon } from "lucide-react";

export type ActionItem = {
  id: string;
  meeting_id: string;
  description: string;
  assigned_to?: string;
  due_date?: string;
  status: 'open' | 'completed';
};

type ActionItemsProps = {
  meetingId: string;
  items: ActionItem[];
};

export function ActionItems({ meetingId, items }: ActionItemsProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation(
    ({ id, status }: { id: string; status: 'open' | 'completed' }) => 
      axios.patch(`/api/action-items/${id}`, { status }),
    {
      onMutate: async ({ id, status }) => {
        await queryClient.cancelQueries(['meeting', meetingId]);

        const previousMeeting = queryClient.getQueryData(['meeting', meetingId]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryClient.setQueryData(['meeting', meetingId], (old: any) => {
          if (!old) return old;
          
          const newItems = old.action_items?.map((item: ActionItem) => {
            if (item.id === id) {
              return { ...item, status };
            }
            return item;
          });

          return { ...old, action_items: newItems };
        });

        return { previousMeeting };
      },
      onError: (err, newTodo, context: { previousMeeting?: unknown } | undefined) => {
        if (context?.previousMeeting) {
          queryClient.setQueryData(['meeting', meetingId], context.previousMeeting);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries(['meeting', meetingId]);
      },
    }
  );

  const toggleStatus = (item: ActionItem) => {
    mutation.mutate({
      id: item.id,
      status: item.status === 'completed' ? 'open' : 'completed'
    });
  };

  return (
    <div className="bg-white dark:bg-[#111111] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111111]/50">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          Action Items
          <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 py-0.5 px-2 rounded-full text-xs font-bold ml-2">
            {items?.length || 0}
          </span>
        </h2>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
        {(!items || items.length === 0) ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            No action items identified.
          </div>
        ) : (
          items.map((item) => {
            const isCompleted = item.status === 'completed';
            
            return (
              <div 
                key={item.id} 
                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex gap-4 ${isCompleted ? 'opacity-60' : ''}`}
              >
                <button 
                  onClick={() => toggleStatus(item)}
                  className="mt-0.5 flex-shrink-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {isCompleted ? (
                    <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0 space-y-2">
                  <p className={`text-sm text-slate-900 dark:text-slate-100 ${isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : ''}`}>
                    {item.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {item.assigned_to && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        <UserIcon className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{item.assigned_to}</span>
                      </div>
                    )}
                    {item.due_date && (
                      <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${
                        new Date(item.due_date) < new Date() && !isCompleted 
                          ? 'text-red-600 bg-red-50 dark:bg-red-900/20' 
                          : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                      }`}>
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(item.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
