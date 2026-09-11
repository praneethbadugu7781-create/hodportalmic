'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  Calendar,
  ExternalLink,
  ChevronRight,
  Info,
  CheckSquare,
  ShieldCheck,
  User,
  Sparkles,
} from 'lucide-react';
import { Task, TaskAssignment } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useToast } from '../ui/Toast';
import { TaskSubmitModal } from './TaskSubmitModal';
import { StudentProfileDetailModal } from './StudentProfileDetailModal';

interface StudentDashboardViewProps {
  user?: {
    id: number | string;
    username: string;
    email: string;
    role: 'student';
  };
  student: {
    id: number | string;
    roll_number: string;
    name: string;
    department: string;
    year: string;
    section: string;
    email: string;
    phone: string;
    academic_session: string;
    status: string;
  };
  isProfileOpen?: boolean;
  showProfileModal?: boolean;
  onCloseProfile?: () => void;
  onCloseProfileModal?: () => void;
}

export function StudentDashboardView({
  user,
  student,
  isProfileOpen: externalProfileOpen,
  showProfileModal,
  onCloseProfile: externalCloseProfile,
  onCloseProfileModal,
}: StudentDashboardViewProps) {
  const { error } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [activeTaskForSubmit, setActiveTaskForSubmit] = useState<any | null>(null);
  const [internalProfileOpen, setInternalProfileOpen] = useState(false);

  const isProfileOpen =
    externalProfileOpen !== undefined
      ? externalProfileOpen
      : showProfileModal !== undefined
      ? showProfileModal
      : internalProfileOpen;
  const handleCloseProfile = externalCloseProfile || onCloseProfileModal || (() => setInternalProfileOpen(false));

  const fetchStudentTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks || []);
      } else {
        error(data.error || 'Failed to load your assigned tasks');
      }
    } catch {
      error('Network error loading tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentTasks();

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchStudentTasks();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, []);

  const totalAssigned = tasks.length;
  const completedList = tasks.filter((t) => t.assignment_status === 'COMPLETED');
  const pendingList = tasks.filter((t) => t.assignment_status === 'PENDING');
  const overdueList = tasks.filter((t) => t.assignment_status === 'OVERDUE');

  const filteredTasks = tasks.filter((t) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'pending') return t.assignment_status === 'PENDING';
    if (selectedTab === 'completed') return t.assignment_status === 'COMPLETED';
    if (selectedTab === 'overdue') return t.assignment_status === 'OVERDUE';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-200 border border-white/10">
              <span className="font-bold text-white uppercase">{student?.roll_number}</span>
              <span>•</span>
              <span>{student?.year} ({student?.section})</span>
            </div>
            <button
              onClick={() => setInternalProfileOpen(true)}
              className="inline-flex items-center gap-1.5 bg-blue-500/30 hover:bg-blue-500/50 text-white text-xs font-bold px-3 py-1 rounded-full border border-blue-400/30 transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>View Details</span>
            </button>
          </div>

          <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
            Welcome, {student?.name || 'Student'}!
          </h1>
          <p className="text-blue-200 text-xs sm:text-sm max-w-xl leading-relaxed">
            Here are your required departmental activities, submissions, and compliance deadlines.
          </p>
        </div>

        {/* Completion summary badge */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between md:justify-start gap-4 shrink-0">
          <div className="text-left md:text-right">
            <div className="text-[11px] sm:text-xs font-semibold text-blue-200 uppercase tracking-wider">My Progress</div>
            <div className="text-xl sm:text-2xl font-black">
              {totalAssigned > 0 ? Math.round((completedList.length / totalAssigned) * 100) : 0}%
            </div>
            <div className="text-[11px] text-blue-200">
              {completedList.length} of {totalAssigned} Done
            </div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* KPI Filter Cards - Responsive 2x2 on Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => setSelectedTab('all')}
          className={`p-3.5 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedTab === 'all'
              ? 'bg-blue-50/80 border-blue-300 shadow-sm ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">My Tasks</span>
            <CheckSquare className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-600" />
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-slate-900">{totalAssigned}</div>
          <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 block truncate">Total activities</span>
        </button>

        <button
          onClick={() => setSelectedTab('completed')}
          className={`p-3.5 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedTab === 'completed'
              ? 'bg-emerald-50/80 border-emerald-300 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">Completed</span>
            <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-emerald-700">{completedList.length}</div>
          <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 block truncate">Submitted</span>
        </button>

        <button
          onClick={() => setSelectedTab('pending')}
          className={`p-3.5 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedTab === 'pending'
              ? 'bg-amber-50/80 border-amber-300 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">Pending</span>
            <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-600" />
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-amber-700">{pendingList.length}</div>
          <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 block truncate">Action required</span>
        </button>

        <button
          onClick={() => setSelectedTab('overdue')}
          className={`p-3.5 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedTab === 'overdue'
              ? 'bg-rose-50/80 border-rose-300 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-700">Overdue</span>
            <AlertTriangle className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-rose-600" />
          </div>
          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-rose-700">{overdueList.length}</div>
          <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 block truncate">Past deadline</span>
        </button>
      </div>

      {/* Task List Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {selectedTab === 'all' && 'All Assigned Tasks'}
            {selectedTab === 'pending' && 'Pending Tasks (Action Required)'}
            {selectedTab === 'completed' && 'Completed Submissions'}
            {selectedTab === 'overdue' && 'Overdue Tasks'}
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-medium">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tasks Cards Grid */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No tasks found in this view</h3>
          <p className="text-xs text-slate-500">
            {selectedTab === 'pending' ? 'Great job! You have no pending tasks.' : 'There are currently no tasks listed under this filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const isCompleted = task.assignment_status === 'COMPLETED';
            const isOverdue = task.assignment_status === 'OVERDUE';

            return (
              <div
                key={task.id || task.assignment_id}
                className={`bg-white rounded-2xl border p-4 sm:p-6 flex flex-col justify-between gap-4 sm:gap-5 transition-all shadow-2xs hover:shadow-md ${
                  isCompleted
                    ? 'border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20'
                    : isOverdue
                    ? 'border-rose-200 bg-gradient-to-b from-white to-rose-50/20'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {task.type?.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                      {isOverdue && <AlertTriangle className="w-3 h-3" />}
                      {!isCompleted && !isOverdue && <Clock className="w-3 h-3" />}
                      <span>{task.assignment_status}</span>
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">{task.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{task.description}</p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Deadline:</span>
                    <span className="font-bold text-slate-800">{formatDate(task.deadline)}</span>
                  </div>
                </div>

                <div className="pt-3.5 sm:pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isCompleted ? (
                    <div className="flex items-center justify-between w-full flex-wrap gap-2">
                      <span className="text-[11px] sm:text-xs text-emerald-700 font-medium">
                        Submitted: {formatDate(task.completed_at || task.submission_submitted_at)}
                      </span>
                      {task.submission_file_url && (
                        <a
                          href={task.submission_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Proof</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveTaskForSubmit(task)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                        isOverdue
                          ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-500/20'
                          : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-500/20'
                      }`}
                    >
                      <span>Submit Now</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Submission Modal */}
      {activeTaskForSubmit && (
        <TaskSubmitModal
          isOpen={!!activeTaskForSubmit}
          onClose={() => setActiveTaskForSubmit(null)}
          task={activeTaskForSubmit}
          onSubmitSuccess={() => {
            fetchStudentTasks();
            setActiveTaskForSubmit(null);
          }}
        />
      )}

      {/* Student Profile Modal */}
      <StudentProfileDetailModal
        isOpen={isProfileOpen}
        onClose={handleCloseProfile}
        student={student}
        tasks={tasks}
      />
    </div>
  );
}
