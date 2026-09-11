'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  FileText,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  Search,
  CheckSquare2,
  Square,
  Eye,
  Download,
  Share2,
  Trash2,
  Archive,
} from 'lucide-react';
import { Task, TaskAssignment } from '@/lib/types';
import { formatDate, formatFileSize, copyToClipboard } from '@/lib/utils';
import { useToast } from '../ui/Toast';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { WhatsAppNoticeModal } from './WhatsAppNoticeModal';
import { ZipDownloadModal } from './ZipDownloadModal';
import { downloadSubmissionsZip } from '@/lib/zipExporter';

interface TaskTrackerProps {
  tasks: Task[];
  selectedTaskId: number | null;
  tasksLoading?: boolean;
  onSelectTask: (taskId: number) => void;
  onOpenStudentProfile: (studentId: number) => void;
  onTaskDeleted?: () => void;
}

export function TaskTracker({
  tasks,
  selectedTaskId,
  tasksLoading = false,
  onSelectTask,
  onOpenStudentProfile,
  onTaskDeleted,
}: TaskTrackerProps) {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<'not_completed' | 'completed'>('not_completed');
  const [taskData, setTaskData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [taskCache, setTaskCache] = useState<Record<number, any>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Checkbox selection state
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderMessageText, setReminderMessageText] = useState('');
  const [showWhatsAppNoticeModal, setShowWhatsAppNoticeModal] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<any>(null);
  const [isZipComplete, setIsZipComplete] = useState(false);
  const [zipResult, setZipResult] = useState<any>(null);

  const activeTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  useEffect(() => {
    if (activeTask?.id) {
      if (taskCache[activeTask.id]) {
        // Instant restore from client cache (0ms delay)
        setTaskData(taskCache[activeTask.id]);
        setLoading(false);
        // SWR revalidate in background
        fetchTaskDetails(activeTask.id, true);
      } else {
        fetchTaskDetails(activeTask.id, false);
      }
      setSelectedStudentIds([]);
    }
  }, [activeTask?.id]);

  const fetchTaskDetails = async (taskId: number, isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/tasks/${taskId}?refresh=true&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setTaskData(data);
        setTaskCache((prev) => ({ ...prev, [taskId]: data }));
      } else if (!isBackground) {
        error(data.error || 'Failed to load task details');
      }
    } catch {
      if (!isBackground) {
        error('Failed to load task details');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  // Real-time live auto-sync without manual page refresh
  useEffect(() => {
    if (!activeTask?.id) return;

    // 1. Instant sync when admin tab gains focus or becomes visible
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchTaskDetails(activeTask.id, true);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 2. Cross-tab instant communication via BroadcastChannel (0ms sync)
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('hod_task_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'TASK_SUBMITTED') {
            fetchTaskDetails(activeTask.id, true);
          }
        };
      }
    } catch {}

    // 3. Cross-tab fallback via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hod_last_submission') {
        fetchTaskDetails(activeTask.id, true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Live polling heartbeat every 3.5 seconds when tab is active
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTaskDetails(activeTask.id, true);
      }
    }, 3500);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorage);
      clearInterval(pollInterval);
      if (channel) channel.close();
    };
  }, [activeTask?.id]);

  const handleDeleteActiveTask = async () => {
    if (!activeTask) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${activeTask.id}?mode=permanent`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || `Task "${activeTask.title}" permanently deleted.`);
        setShowDeleteModal(false);
        onTaskDeleted?.();
      } else {
        error(data.error || 'Failed to delete task');
      }
    } catch {
      error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const completedList: any[] = taskData?.completed || [];
  const notCompletedList: any[] = taskData?.not_completed || [];

  const handleDownloadZip = async () => {
    if (!activeTask) return;
    const withFiles = completedList.filter((s) => s.submission_file_url);
    if (withFiles.length === 0) {
      info('No student proof files have been uploaded yet for this task.');
      return;
    }
    setIsExportingZip(true);
    setIsZipComplete(false);
    setZipResult(null);
    try {
      const res = await downloadSubmissionsZip(
        activeTask.title,
        completedList,
        (prog) => setZipProgress(prog)
      );
      setZipResult(res);
      setIsZipComplete(true);
      success(`Successfully exported ${res.downloadedCount} submissions to ZIP!`);
    } catch (err: any) {
      error(err?.message || 'Failed to generate ZIP archive');
      setIsExportingZip(false);
    }
  };

  // Filter students based on search and section
  const filterList = (list: any[]) => {
    return list.filter((s) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSec = sectionFilter === 'all' || s.section === sectionFilter;
      const matchesYear = yearFilter === 'all' || s.year === yearFilter;
      return matchesSearch && matchesSec && matchesYear;
    });
  };

  const filteredCompleted = filterList(completedList);
  const filteredNotCompleted = filterList(notCompletedList);

  // Selection handlers
  const handleToggleSelectStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredNotCompleted.map((s) => s.student_id);
    setSelectedStudentIds(allFilteredIds);
    info(`Selected all ${allFilteredIds.length} pending students`);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  // Copying logic
  const handleCopyPending = async (
    format: 'newline' | 'comma' | 'with_names' | 'reminder' = 'newline',
    onlySelected: boolean = false
  ) => {
    const targetStudents = onlySelected
      ? notCompletedList.filter((s) => selectedStudentIds.includes(s.student_id))
      : notCompletedList;

    if (targetStudents.length === 0) {
      info('No students to copy.');
      return;
    }

    let textToCopy = '';
    const rolls = targetStudents.map((s) => s.roll_number);

    if (format === 'newline') {
      textToCopy = rolls.join('\n');
    } else if (format === 'comma') {
      textToCopy = rolls.join(', ');
    } else if (format === 'with_names') {
      textToCopy = targetStudents.map((s) => `${s.roll_number} - ${s.name} (${s.year}, Sec ${s.section})`).join('\n');
    } else if (format === 'reminder') {
      const deadlineStr = formatDate(activeTask.deadline);
      textToCopy = `📢 Department Notice: Pending Submissions\n\nTask: ${activeTask.title}\nDeadline: ${deadlineStr}\n\nStudents with the following roll numbers have NOT completed this required task yet. Please submit immediately:\n\n${rolls.join('\n')}\n\n- Department of Artificial Intelligence & Machine Learning (AIML)`;
    }

    const copied = await copyToClipboard(textToCopy);
    if (copied) {
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2500);
      success(`${targetStudents.length} roll numbers copied to clipboard!`);
    } else {
      error('Could not copy to clipboard. Please check browser permissions.');
    }
  };

  const handleOpenReminderModal = (onlySelected: boolean = false) => {
    const targetStudents = onlySelected
      ? notCompletedList.filter((s) => selectedStudentIds.includes(s.student_id))
      : notCompletedList;

    const rolls = targetStudents.map((s) => s.roll_number);
    const deadlineStr = formatDate(activeTask?.deadline);
    const msg = `📢 *DEPARTMENT NOTICE: PENDING TASK*\n\n📌 *Task:* ${activeTask?.title}\n⏰ *Deadline:* ${deadlineStr}\n\n⚠️ The following students have *NOT* completed the task. Please submit your required proof/confirmation immediately:\n\n${rolls.join('\n')}\n\n_Department Administration_`;
    setReminderMessageText(msg);
    setShowReminderModal(true);
  };

  if (tasksLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 animate-pulse space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-5 w-32 bg-slate-200 rounded-lg" />
              <div className="h-5 w-24 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-7 w-72 bg-slate-200 rounded-md" />
            <div className="h-4 w-96 bg-slate-100 rounded-md" />
          </div>
          <div className="h-20 w-56 bg-slate-100 rounded-xl" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 bg-slate-100 rounded-xl" />
          <div className="h-10 w-44 bg-slate-100 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-slate-50 border border-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!activeTask) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Active Tasks Yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Create your first department task using &quot;Create New Task&quot; to assign activities, collect proof submissions, and track pending roll numbers.
        </p>
      </div>
    );
  }

  const completionRate = taskData?.summary?.completion_rate ?? activeTask.completion_rate ?? 0;
  const totalAssigned = taskData?.summary?.total_assigned ?? activeTask.total_assigned ?? 0;
  const completedCount = taskData?.summary?.completed_count ?? activeTask.completed_count ?? 0;
  const pendingCount = taskData?.summary?.pending_count ?? activeTask.pending_count ?? 0;
  const overdueCount = taskData?.summary?.overdue_count ?? activeTask.overdue_count ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header & Task Selector */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                Task Specific Tracking
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Real-Time Sync</span>
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                activeTask.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                activeTask.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {activeTask.priority} Priority
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                Type: {activeTask.type.replace('_', ' ')}
              </span>
            </div>

            {/* Task Switcher Dropdown */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={activeTask.id}
                onChange={(e) => onSelectTask(Number(e.target.value))}
                className="text-lg sm:text-xl font-bold text-slate-900 bg-transparent border-0 border-b-2 border-slate-300 hover:border-blue-600 focus:ring-0 focus:border-blue-600 py-1 pr-8 cursor-pointer max-w-xl truncate"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.completion_rate ?? 0}% completed)
                  </option>
                ))}
              </select>
            </div>

            <p className="text-sm text-slate-600 pt-1 leading-relaxed">
              {activeTask.description}
            </p>
          </div>

          {/* Quick Metrics & Deadline */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-xs text-slate-500 font-medium">
              Deadline: <span className="font-bold text-slate-800">{formatDate(activeTask.deadline)}</span>
            </div>
            <div className="w-full sm:w-48 lg:w-56 space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Completion</span>
                <span className="text-blue-600">{completionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>{completedCount} Done</span>
                <span className="text-amber-600 font-bold">{pendingCount + overdueCount} Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Action Toolbar */}
      <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3">
        {/* Tier 1: Tab Switcher & Status Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-200/90 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('not_completed')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'not_completed'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4 text-rose-600 shrink-0" />
              <span>NOT COMPLETED ({pendingCount + overdueCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>COMPLETED ({completedCount})</span>
            </button>
          </div>

          {/* Quick Selection / Summary Pill */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {selectedStudentIds.length > 0 ? (
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg text-xs font-bold text-blue-700 animate-in fade-in">
                <span>{selectedStudentIds.length} students selected</span>
                <button
                  onClick={handleClearSelection}
                  className="text-[11px] underline hover:text-blue-900 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                Showing {activeTab === 'not_completed' ? notCompletedList.length : completedList.length} students
              </span>
            )}
          </div>
        </div>

        {/* Tier 2: Dedicated Action Buttons Toolbar - Guaranteed 100% visible on all screens */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-200">
          {/* Left Actions: Copy & WhatsApp */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'not_completed' && (
              <>
                {/* Primary Copy Button Group */}
                <div className="relative inline-flex rounded-xl shadow-xs">
                  <button
                    onClick={() => handleCopyPending('newline', false)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3.5 sm:px-4 py-2 rounded-l-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    {copiedFormat === 'newline' ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
                    <span>COPY ROLLS ({notCompletedList.length})</span>
                  </button>

                  <div className="relative group">
                    <button
                      className="bg-blue-700 hover:bg-blue-800 text-white px-2.5 py-2 rounded-r-xl border-l border-blue-500 font-semibold text-sm transition-colors cursor-pointer"
                      title="More copy formats"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 hidden group-hover:block z-30 animate-in fade-in duration-150">
                      <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Copy Formats
                      </div>
                      <button
                        onClick={() => handleCopyPending('newline', false)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between cursor-pointer"
                      >
                        <span>One per line (WhatsApp)</span>
                        <span className="text-[11px] text-slate-400">6148\n6152</span>
                      </button>
                      <button
                        onClick={() => handleCopyPending('comma', false)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between cursor-pointer"
                      >
                        <span>Comma-separated</span>
                        <span className="text-[11px] text-slate-400">6148, 6152</span>
                      </button>
                      <button
                        onClick={() => handleCopyPending('with_names', false)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between cursor-pointer"
                      >
                        <span>With Student Names</span>
                        <span className="text-[11px] text-slate-400">6148 - Aarav</span>
                      </button>
                      <div className="border-t border-slate-100 my-1"></div>
                      <button
                        onClick={() => setShowWhatsAppNoticeModal(true)}
                        className="w-full text-left px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp Notice Broadcast</span>
                      </button>
                      <button
                        onClick={() => handleOpenReminderModal(false)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                        <span>Plain Text Template</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Copy Selected */}
                {selectedStudentIds.length > 0 && (
                  <button
                    onClick={() => handleCopyPending('newline', true)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Copy {selectedStudentIds.length} Selected</span>
                  </button>
                )}

                {/* WhatsApp Broadcast Notice Trigger */}
                <button
                  onClick={() => setShowWhatsAppNoticeModal(true)}
                  className="flex items-center gap-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] border border-[#25D366]/40 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
                  title="Broadcast circular to WhatsApp"
                >
                  <Share2 className="w-4 h-4 shrink-0 text-[#128C7E]" />
                  <span>WhatsApp Notice</span>
                </button>
              </>
            )}
          </div>

          {/* Right Actions: DOWNLOAD SUBMISSIONS (.ZIP) & EXPORT PDF REPORT & DELETE */}
          <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-0">
            {/* Download Submissions (.ZIP) Button */}
            {(activeTask.type === 'FILE_SUBMISSION' || completedList.some((s) => s.submission_file_url)) && (
              <button
                onClick={handleDownloadZip}
                disabled={isExportingZip}
                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Download all submitted student proof documents in a ZIP file"
              >
                <Download className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Download ZIP</span>
                <span className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-indigo-200/80 rounded-md font-extrabold text-indigo-900">
                  {completedList.filter((s) => s.submission_file_url).length} files
                </span>
              </button>
            )}

            {/* Export Task PDF Report Button */}
            <button
              onClick={async () => {
                try {
                  const { exportTaskReportPdf } = await import('@/lib/pdf-export');
                  await exportTaskReportPdf(activeTask, completedList, notCompletedList);
                  success('Official Task Compliance PDF Report generated!');
                } catch {
                  error('Failed to export PDF');
                }
              }}
              className="flex items-center gap-2 bg-slate-900 hover:bg-black active:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              title="Download formal MIC Compliance PDF Report"
            >
              <Download className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Export PDF</span>
            </button>

            {/* Delete Task Button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/90 px-3 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              title="Delete this task permanently"
            >
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar inside Task */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search roll no or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="flex-1 sm:flex-initial text-xs font-medium px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
          >
            <option value="all">All Years</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="Final Year">Final Year</option>
          </select>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="flex-1 sm:flex-initial text-xs font-medium px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700"
          >
            <option value="all">All Sections (A &amp; B)</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>

          {activeTab === 'not_completed' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 shrink-0">
              <button
                onClick={handleSelectAll}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                Select All
              </button>
              {selectedStudentIds.length > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Clear ({selectedStudentIds.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Student List View */}
      <div className="overflow-x-auto">
        {loading && !taskData ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-lg w-full" />
            <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl w-full" />
            <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl w-full" />
            <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl w-full" />
            <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl w-full" />
          </div>
        ) : activeTab === 'not_completed' ? (
          filteredNotCompleted.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Pending Students 🎉</h3>
              <p className="text-xs text-slate-500 mt-1">
                Every targeted student has completed this activity.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredNotCompleted.map((s) => {
                  const isSelected = selectedStudentIds.includes(s.student_id);
                  const isOverdue = s.assignment_status === 'OVERDUE';
                  return (
                    <div
                      key={s.student_id}
                      className={`p-3.5 flex items-start gap-3 transition-colors ${
                        isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(s.student_id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono font-black text-slate-900 text-sm tracking-tight">
                            {s.roll_number}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isOverdue && <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />}
                            {s.assignment_status}
                          </span>
                        </div>
                        <div className="font-bold text-slate-800 text-xs mt-0.5 truncate">{s.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                          <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            Sec {s.section}
                          </span>
                          <span>•</span>
                          <span>{s.year}</span>
                          {s.phone && (
                            <>
                              <span>•</span>
                              <span className="truncate">{s.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenStudentProfile(s.student_id)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 shrink-0 cursor-pointer"
                        title="View Student Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (>= md) */}
              <table className="hidden md:table w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredNotCompleted.length > 0 &&
                          selectedStudentIds.length === filteredNotCompleted.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) handleSelectAll();
                          else handleClearSelection();
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNotCompleted.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.student_id);
                    const isOverdue = s.assignment_status === 'OVERDUE';
                    return (
                      <tr
                        key={s.student_id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(s.student_id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {s.roll_number}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {s.name}
                          {s.phone && (
                            <span className="block text-xs font-normal text-slate-400">{s.phone}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{s.year}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                            Sec {s.section}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                            {s.assignment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onOpenStudentProfile(s.student_id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Profile</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )
        ) : (
          /* Completed Students Tab */
          filteredCompleted.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Submissions Yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Completed submissions will appear here once students submit.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredCompleted.map((s) => (
                  <div
                    key={s.student_id}
                    className="p-3.5 bg-white hover:bg-slate-50 flex items-start gap-3 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono font-black text-slate-900 text-sm tracking-tight">
                          {s.roll_number}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          Done
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 text-xs mt-0.5 truncate">{s.name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                          Sec {s.section}
                        </span>
                        <span>•</span>
                        <span>{s.year}</span>
                        <span>•</span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(s.completed_at || s.submission_submitted_at)}
                        </span>
                      </div>
                      {/* Proof Document or Response */}
                      <div className="mt-2">
                        {s.submission_file_url ? (
                          <a
                            href={s.submission_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 max-w-full truncate"
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{s.submission_file_name || 'Proof Document'}</span>
                            <Download className="w-3 h-3 text-blue-400 shrink-0" />
                          </a>
                        ) : s.submission_response ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60 max-w-full truncate">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{s.submission_response}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Completed</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenStudentProfile(s.student_id)}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 shrink-0 cursor-pointer"
                      title="View Student Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <table className="hidden md:table w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4">Completed At</th>
                    <th className="py-3 px-4">Submission / Proof</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompleted.map((s) => (
                    <tr key={s.student_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {s.roll_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{s.name}</td>
                      <td className="py-3 px-4 text-slate-600">{s.year}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                          Sec {s.section}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {formatDate(s.completed_at || s.submission_submitted_at)}
                      </td>
                      <td className="py-3 px-4">
                        {s.submission_file_url ? (
                          <a
                            href={s.submission_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="max-w-[140px] truncate">
                              {s.submission_file_name || 'Proof Document'}
                            </span>
                            <Download className="w-3 h-3 text-blue-400" />
                          </a>
                        ) : s.submission_response ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {s.submission_response}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Completed</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onOpenStudentProfile(s.student_id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        )}
      </div>

      {/* Reminder Message Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Department Reminder Notice</h3>
              </div>
              <button
                onClick={() => setShowReminderModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3 mb-2">
              You can edit this message before copying it into your department's WhatsApp group or official channel:
            </p>

            <textarea
              rows={8}
              value={reminderMessageText}
              onChange={(e) => setReminderMessageText(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Contains {notCompletedList.length} pending roll numbers
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const copied = await copyToClipboard(reminderMessageText);
                    if (copied) {
                      success('Reminder message copied to clipboard!');
                      setShowReminderModal(false);
                    } else {
                      error('Failed to copy text');
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Message</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Task Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        title="Delete Department Task"
        itemName={activeTask ? `📌 ${activeTask.title}` : ''}
        itemDescription={activeTask?.description}
        warningText="Permanently deleting this task will remove the task, all assigned student records, and all uploaded proof files/submissions from MongoDB Atlas. This action cannot be undone."
        confirmLabel="Yes, Delete Task"
        isDeleting={isDeleting}
        onConfirm={handleDeleteActiveTask}
        onClose={() => setShowDeleteModal(false)}
      />

      {/* WhatsApp Department Notice Broadcast Modal */}
      <WhatsAppNoticeModal
        isOpen={showWhatsAppNoticeModal}
        onClose={() => setShowWhatsAppNoticeModal(false)}
        task={activeTask}
        notCompletedStudents={notCompletedList}
      />

      {/* Submissions ZIP Exporter Modal */}
      <ZipDownloadModal
        isOpen={isExportingZip}
        onClose={() => setIsExportingZip(false)}
        progress={zipProgress}
        isComplete={isZipComplete}
        result={zipResult}
        taskTitle={activeTask?.title || 'Task Submissions'}
      />
    </div>
  );
}
