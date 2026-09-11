'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  X,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Award,
  Hash,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { exportSubmissionReceiptPdf, SubmissionReceiptData } from '@/lib/pdf-export';
import { useToast } from '../ui/Toast';

interface SubmissionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    roll_number: string;
    name: string;
    year: string;
    section: string;
    department?: string;
    email?: string;
  };
  task: any;
}

export function SubmissionReceiptModal({
  isOpen,
  onClose,
  student,
  task,
}: SubmissionReceiptModalProps) {
  const { success, error } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !task) return null;

  const refNumber = `MIC-AIML-${String(task.id || task.assignment_id || '000000').slice(-6).toUpperCase()}-${student?.roll_number}`;
  const submittedDate = formatDate(task.completed_at || task.submission_submitted_at || new Date());
  const proofFileName = task.submission_file_name || null;
  const proofFileUrl = task.submission_file_url || null;
  const responseText = task.submission_response || null;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const receiptData: SubmissionReceiptData = {
        student: {
          roll_number: student.roll_number,
          name: student.name,
          year: student.year,
          section: student.section,
          department: student.department || 'Artificial Intelligence & Machine Learning',
          email: student.email,
        },
        task: {
          id: task.id || task.assignment_id,
          title: task.title,
          description: task.description,
          type: task.type || 'TASK',
          deadline: task.deadline,
        },
        submission: {
          response: responseText,
          file_url: proofFileUrl,
          file_name: proofFileName,
          submitted_at: task.submission_submitted_at,
          completed_at: task.completed_at,
        },
      };

      await exportSubmissionReceiptPdf(receiptData);
      success('Official Submission Receipt PDF downloaded!');
    } catch (err: any) {
      error('Failed to generate receipt PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Official Submission Receipt
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Verified departmental acknowledgment pass
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-200/80 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-white text-slate-900">
          {/* Institutional Letterhead */}
          <div className="text-center pb-4 border-b border-slate-200/80 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <img
                src="/logo-mic.png"
                alt="MIC Logo"
                className="h-9 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight font-display">
              DVR &amp; Dr. HS MIC College of Technology
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold">
              Autonomous Institution • Approved by AICTE, Affiliated to JNTUK
            </p>
            <p className="text-[11px] sm:text-xs font-bold text-blue-700">
              Department of Artificial Intelligence &amp; Machine Learning (AIML)
            </p>
          </div>

          {/* Verification Badge */}
          <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-emerald-900 tracking-wide uppercase">
                  Submission Verified &amp; Recorded
                </span>
                <span className="text-[10px] font-bold bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium truncate">
                Ref ID: <span className="font-mono font-bold">{refNumber}</span>
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">
                Recorded On: {submittedDate}
              </p>
            </div>
          </div>

          {/* Student Identification Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Student Information
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Roll Number:</span>
                <span className="font-extrabold text-slate-900 font-mono text-sm">
                  {student?.roll_number}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Student Name:</span>
                <span className="font-bold text-slate-900 truncate block">
                  {student?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Academic Year:</span>
                <span className="font-semibold text-slate-800">
                  {student?.year} (Sec {student?.section})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Department:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {student?.department || 'AIML'}
                </span>
              </div>
            </div>
          </div>

          {/* Task Particulars */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
            <div className="p-3 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
              <span>Task Particulars</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                {task.type?.replace('_', ' ')}
              </span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-slate-500 shrink-0">Activity Title:</span>
              <span className="font-extrabold text-slate-900 text-right">{task.title}</span>
            </div>
            <div className="p-3 flex justify-between gap-4">
              <span className="text-slate-500 shrink-0">Official Deadline:</span>
              <span className="font-medium text-slate-700">{formatDate(task.deadline)}</span>
            </div>
            {proofFileName && (
              <div className="p-3 flex justify-between items-center gap-4">
                <span className="text-slate-500 shrink-0">Uploaded Document:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-800 truncate max-w-[180px] font-semibold">
                    {proofFileName}
                  </span>
                  {proofFileUrl && (
                    <a
                      href={proofFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {responseText && !proofFileName && (
              <div className="p-3 flex justify-between gap-4">
                <span className="text-slate-500 shrink-0">Recorded Response:</span>
                <span className="font-semibold text-slate-900 font-mono">{responseText}</span>
              </div>
            )}
            <div className="p-3 flex justify-between gap-4 bg-emerald-50/40">
              <span className="text-emerald-800 font-semibold shrink-0">Compliance Result:</span>
              <span className="font-extrabold text-emerald-700">COMPLETED &amp; ARCHIVED</span>
            </div>
          </div>

          {/* Department Seal Line */}
          <div className="pt-4 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              <p className="font-semibold text-slate-600">Electronic Verification</p>
              <p className="text-[10px]">MIC AIML Department Portal</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-700">Head of Department (AIML)</p>
              <p className="text-[10px]">DVR &amp; Dr. HS MIC College of Tech</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Generating PDF...' : 'Download Receipt (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
