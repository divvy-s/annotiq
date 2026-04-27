import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "react-query";
import axios from "axios";

type SpeakerRenameModalProps = {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  speakerId: string;
  currentName: string;
};

export function SpeakerRenameModal({ isOpen, onClose, meetingId, speakerId, currentName }: SpeakerRenameModalProps) {
  const [name, setName] = useState(currentName);
  const queryClient = useQueryClient();

  useEffect(() => {
    setName(currentName);
  }, [currentName, isOpen]);

  const mutation = useMutation(
    (newName: string) => axios.patch(`/api/meetings/${meetingId}/speakers/${speakerId}`, { display_name: newName }),
    {
      onMutate: async (newName) => {
        await queryClient.cancelQueries(['meeting', meetingId]);

        const previousMeeting = queryClient.getQueryData(['meeting', meetingId]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryClient.setQueryData(['meeting', meetingId], (old: any) => {
          if (!old) return old;
          
          // Optimistically update the transcript chunks
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newChunks = old.transcript_chunks?.map((chunk: any) => {
            if (chunk.speaker_id === speakerId || chunk.speaker_label === currentName) {
              return { ...chunk, speaker_label: newName, display_name: newName };
            }
            return chunk;
          });

          return {
            ...old,
            transcript_chunks: newChunks
          };
        });

        return { previousMeeting };
      },
      onError: (err, newName, context: { previousMeeting?: unknown } | undefined) => {
        if (context?.previousMeeting) {
          queryClient.setQueryData(['meeting', meetingId], context.previousMeeting);
        }
        alert("Failed to rename speaker.");
      },
      onSettled: () => {
        queryClient.invalidateQueries(['meeting', meetingId]);
      },
    }
  );

  const handleSave = () => {
    if (name.trim() && name !== currentName) {
      mutation.mutate(name.trim());
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111111] rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 transform transition-all animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Rename Speaker</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <label htmlFor="speaker-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Speaker Name
          </label>
          <input
            id="speaker-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="e.g. Jane Doe"
          />
        </div>

        <div className="p-6 pt-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={mutation.isLoading || !name.trim()}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
