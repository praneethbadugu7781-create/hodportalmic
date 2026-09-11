'use client';

import React from 'react';
import {
  Archive,
  Download,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  X,
  FileSpreadsheet,
  FolderTree,
} from 'lucide-react';
import { ZipExportProgress } from '@/lib/zipExporter';

interface ZipDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ZipExportProgress | null;
  isComplete: boolean;
  result: { downloadedCount: number; failedCount: number; zipSizeMb: number } | null;
  taskTitle: string;
}

export function ZipDownloadModal({
  isOpen,
  onClose,
  progress,
  isComplete,
  result,
  taskTitle,
}: ZipDownloadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
              isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isComplete ? <CheckCircle2 className="w-6 h-6" /> : <Archive className="w-6 h-6 animate-pulse" />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base font-display">
                {isComplete ? 'Package Downloaded!' : 'Exporting Submissions ZIP'}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[240px]">
                {taskTitle}
              </p>
            </div>
          </div>
          {isComplete && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar or Completion Details */}
        {!isComplete ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">
                {progress?.statusText || 'Downloading files from cloud...'}
              </span>
              <span className="text-blue-600 font-extrabold">{progress?.percent || 0}%</span>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 shadow-xs"
                style={{ width: `${progress?.percent || 0}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-400 font-mono truncate pt-1">
              File: {progress?.currentFile || 'Connecting...'}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                <FileArchive className="w-4 h-4 text-emerald-700" />
                <span>ZIP Archive Saved Successfully</span>
              </div>
              <ul className="space-y-1.5 text-emerald-800 text-[11px] pt-1">
                <li className="flex items-center gap-2">
                  <FolderTree className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{result?.downloadedCount || 0} files</strong> categorized into <code>Section_A/</code> and <code>Section_B/</code>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Includes <strong>Submission_Manifest.csv</strong> audit trail</span>
                </li>
                <li className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Archive size: <strong>{result?.zipSizeMb || 0} MB</strong></span>
                </li>
              </ul>
            </div>

            {result && result.failedCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{result.failedCount} files failed to download (see manifest for details).</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            disabled={!isComplete}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              isComplete
                ? 'bg-slate-900 hover:bg-black text-white cursor-pointer shadow-xs'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isComplete ? 'Close' : 'Please wait...'}
          </button>
        </div>
      </div>
    </div>
  );
}
