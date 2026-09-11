'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Upload,
  ExternalLink,
  FileText,
  AlertCircle,
  X,
  Check,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { Task, TaskAssignment } from '@/lib/types';
import { formatDate, formatFileSize } from '@/lib/utils';
import { useToast } from '../ui/Toast';

interface TaskSubmitModalProps {
  task: (Task & { assignment_id?: number | string; assignment_status?: string; submission_response?: string; submission_file_url?: string; submission_file_name?: string }) | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export function TaskSubmitModal({ task, isOpen, onClose, onSubmitSuccess }: TaskSubmitModalProps) {
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [yesNoResponse, setYesNoResponse] = useState<'YES' | 'NO' | null>(null);
  const [linkConfirmed, setLinkConfirmed] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen || !task) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      error('File size exceeds 15 MB limit. Please select a smaller file.');
      return;
    }

    setUploading(true);
    setUploadProgress(25);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      setUploadProgress(80);
      const data = await res.json();
      if (res.ok) {
        setUploadedFile({
          url: data.url,
          name: data.fileName,
          size: data.fileSize,
        });
        setUploadProgress(100);
        success('Proof document uploaded successfully to cloud!');
      } else {
        error(data.error || 'File upload failed');
      }
    } catch {
      error('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let responsePayload: any = {
        task_id: task.id,
      };

      if (task.type === 'YES_NO') {
        if (!yesNoResponse) {
          error('Please select YES or NO');
          setSubmitting(false);
          return;
        }
        responsePayload.response = yesNoResponse;
      } else if (task.type === 'FILE_SUBMISSION') {
        if (!uploadedFile) {
          error('Please upload your proof document before submitting.');
          setSubmitting(false);
          return;
        }
        responsePayload.file_url = uploadedFile.url;
        responsePayload.file_name = uploadedFile.name;
        responsePayload.file_size = uploadedFile.size;
        responsePayload.response = 'File Proof Submitted';
      } else if (task.type === 'LINK_CONFIRMATION') {
        if (!linkConfirmed) {
          error('Please confirm you have completed the required activity.');
          setSubmitting(false);
          return;
        }
        responsePayload.response = 'CONFIRMED_EXTERNAL_ACTIVITY';
      }

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responsePayload),
      });

      const data = await res.json();
      if (res.ok) {
        success(data.message || 'Task submitted successfully!');
        // Instant cross-tab sync to Admin Portal
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const channel = new BroadcastChannel('hod_task_sync');
            channel.postMessage({ type: 'TASK_SUBMITTED', taskId: task.id, timestamp: Date.now() });
            channel.close();
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('hod_last_submission', JSON.stringify({ taskId: task.id, timestamp: Date.now() }));
          }
        } catch {}

        onSubmitSuccess();
        onClose();
      } else {
        error(data.error || 'Failed to submit task');
      }
    } catch {
      error('An error occurred while submitting');
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = task.assignment_status === 'OVERDUE';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                {task.type.replace('_', ' ')}
              </span>
              {isOverdue && (
                <span className="text-[11px] sm:text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight mt-1">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-sm">
          {/* Instructions */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Instructions &amp; Details</div>
            <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">{task.description}</p>
            {task.instructions && (
              <div className="text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                <span className="font-bold text-slate-700 block mb-0.5">Steps:</span>
                {task.instructions}
              </div>
            )}
            <div className="text-[11px] text-slate-500 pt-1 font-medium">
              Deadline: <span className="font-bold text-slate-800">{formatDate(task.deadline)}</span>
            </div>
          </div>

          {/* Submission Form by Task Type */}
          {task.type === 'YES_NO' && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Have you completed this required action?
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setYesNoResponse('YES')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    yesNoResponse === 'YES'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <span className="text-xs font-bold">YES, COMPLETED</span>
                </button>

                <button
                  type="button"
                  onClick={() => setYesNoResponse('NO')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                    yesNoResponse === 'NO'
                      ? 'border-slate-600 bg-slate-100 text-slate-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <X className="w-6 h-6 text-slate-500" />
                  <span className="text-xs font-bold">NOT YET</span>
                </button>
              </div>
            </div>
          )}

          {task.type === 'FILE_SUBMISSION' && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Upload Proof Document / Screenshot (Max 15MB) *
              </label>

              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-5 sm:p-6 text-center transition-colors bg-slate-50 relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="font-bold text-slate-800 text-xs sm:text-sm">
                  {uploading ? 'Uploading to ImageKit...' : uploadedFile ? uploadedFile.name : 'Tap to Select Photo or Document'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {uploadedFile ? `${formatFileSize(uploadedFile.size)} • Ready to submit` : 'Take photo or choose PDF, JPG, PNG'}
                </p>
              </div>

              {uploading && (
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-2 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          )}

          {task.type === 'LINK_CONFIRMATION' && (
            <div className="space-y-4 pt-2">
              {task.external_link && (
                <a
                  href={task.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 p-3.5 rounded-2xl font-bold text-xs transition-colors"
                >
                  <span>Open External Link / Survey</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkConfirmed}
                  onChange={(e) => setLinkConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-800 leading-snug">
                  I have opened the external link and completed the required activity.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : 'Submit Response'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
