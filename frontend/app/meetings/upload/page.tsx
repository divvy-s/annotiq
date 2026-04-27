"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { UploadCloud, File, X, CheckCircle } from "lucide-react";
import { Progress } from "../../../components/ui/progress";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type.startsWith("audio/") || droppedFile.type.startsWith("video/"))) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.split('.').slice(0, -1).join('.'));
      }
    } else {
      alert("Please upload a valid audio or video file.");
    }
  }, [title]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.split('.').slice(0, -1).join('.'));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", description);

    try {
      const response = await axios.post("/api/meetings/upload", formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      setToast("Processing started");
      setTimeout(() => {
        router.push(`/meetings/${response.data.id || response.data.meeting_id}`);
      }, 1500);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload the file. Please try again.");
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex flex-col items-center py-20 px-4 sm:px-6 lg:px-8">
      {toast && (
        <div className="fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{toast}</span>
        </div>
      )}

      <div className="max-w-3xl w-full space-y-8 bg-white dark:bg-[#111111] p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Upload Meeting</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Upload an audio or video file to generate AI intelligence and a transcript.
          </p>
        </div>

        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-8 flex justify-center rounded-2xl border-2 border-dashed px-6 pt-12 pb-14 transition-all duration-200 ease-in-out ${
              isDragging
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                : "border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <div className="text-center">
              <UploadCloud className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
              <div className="mt-4 flex text-sm leading-6 text-slate-600 dark:text-slate-400 justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer rounded-md font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2"
                >
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept="audio/*,video/*"
                    onChange={handleFileChange}
                    data-testid="file-upload-input"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-500 mt-2">
                MP3, WAV, MP4 up to 500MB
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <File className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white max-w-xs truncate" title={file.name}>
                    {file.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatFileSize(file.size)} • {file.type || "Unknown type"}
                  </p>
                </div>
              </div>
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="title" className="block text-sm font-medium leading-6 text-slate-900 dark:text-white">
                  Meeting Title
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="title"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 dark:text-white dark:bg-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all"
                    placeholder="E.g., Q3 Planning Session"
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium leading-6 text-slate-900 dark:text-white">
                  Description (Optional)
                </label>
                <div className="mt-2">
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 dark:text-white dark:bg-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all"
                    placeholder="Brief description of the meeting contents..."
                    disabled={isUploading}
                  />
                </div>
              </div>

              {isUploading && (
                <div className="pt-4 pb-2">
                  <div className="flex justify-between text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2 w-full" />
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  disabled={isUploading || !title.trim()}
                  onClick={handleUpload}
                  className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {isUploading ? "Uploading..." : "Upload & Process"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
