'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ExternalLink,
  ChevronRight,
  Download,
  Calendar,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Task } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { TaskSubmitModal } from './TaskSubmitModal';
import { StudentProfileDetailModal } from './StudentProfileDetailModal';
import { useToast } from '../ui/Toast';

interface StudentDashboardViewProps {
  student: any;
  showProfileModal?: boolean;
  onCloseProfileModal?: () => void;
}

export function StudentDashboardView({ student, showProfileModal, onCloseProfileModal }: StudentDashboardViewProps) {
  const { error } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [activeTaskForSubmit, setActiveTaskForSubmit] = useState<any>(null);
  const [internalProfileOpen, setInternalProfileOpen] = useState(false);

  useEffect(() => {
    fetchStudentTasks();
  }, []);

  const isProfileOpen = showProfileModal !== undefined ? showProfileModal : internalProfileOpen;
  const handleCloseProfile = onCloseProfileModal || (() => setInternalProfileOpen(false));

  const fetchStudentTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks || []);
      } else {
        error(data.error || 'Failed to load assigned tasks');
      }
    } catch {
      error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-200 border border-white/10">
              <span>Roll No: {student?.roll_number}</span>
              <span>•</span>
              <span>{student?.year} ({student?.section})</span>
            </div>
            <button
              onClick={() => setInternalProfileOpen(true)}
              className="inline-flex items-center gap-1.5 bg-blue-500/30 hover:bg-blue-500/50 text-white text-xs font-bold px-3 py-1 rounded-full border border-blue-400/30 transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>View My Details</span>
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {student?.name || 'Student'}!
          </h1>
          <p className="text-blue-200 text-xs sm:text-sm max-w-xl leading-relaxed">
            Here are your required departmental activities, submissions, and compliance deadlines. Complete all pending tasks to keep your records updated.
          </p>
        </div>

        {/* Completion summary badge */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-xs font-semibold text-blue-200 uppercase">Progress</div>
            <div className="text-2xl font-black">
              {totalAssigned > 0 ? Math.round((completedList.length / totalAssigned) * 100) : 0}%
            </div>
            <div className="text-[11px] text-blue-200">
              {completedList.length} of {totalAssigned} Done
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setSelectedTab('all')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            selectedTab === 'all'
              ? 'bg-blue-50/70 border-blue-300 shadow-sm ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">My Tasks</span>
            <CheckSquare className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{totalAssigned}</div>
          <span className="text-xs text-slate-500 mt-1 block">Total assigned activities</span>
        </button>

        <button
          onClick={() => setSelectedTab('completed')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            selectedTab === 'completed'
              ? 'bg-emerald-50/70 border-emerald-300 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{completedList.length}</div>
          <span className="text-xs text-slate-500 mt-1 block">Successfully submitted</span>
        </button>

        <button
          onClick={() => setSelectedTab('pending')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            selectedTab === 'pending'
              ? 'bg-amber-50/70 border-amber-300 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">{pendingList.length}</div>
          <span className="text-xs text-slate-500 mt-1 block">Requires your submission</span>
        </button>

        <button
          onClick={() => setSelectedTab('overdue')}
          className={`p-5 rounded-2xl border text-left transition-all ${
            selectedTab === 'overdue'
              ? 'bg-rose-50/70 border-rose-300 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">{overdueList.length}</div>
          <span className="text-xs text-slate-500 mt-1 block">Deadline has passed</span>
        </button>
      </div>

      {/* Task List Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {selectedTab === 'all' && 'All Assigned Tasks'}
            {selectedTab === 'pending' && 'Pending Tasks (Action Required)'}
            {selectedTab === 'completed' && 'Completed Submissions'}
            {selectedTab === 'overdue' && 'Overdue Tasks'}
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-medium">Showing {filteredTasks.length} tasks</span>
      </div>

      {/* Tasks Cards Grid */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
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
                className={`bg-white rounded-2xl border p-6 flex flex-col justify-between gap-5 transition-all shadow-2xs hover:shadow-md ${
                  isCompleted
                    ? 'border-emerald-200/80 bg-linear-to-b from-white to-emerald-50/20'
                    : isOverdue
                    ? 'border-rose-200 bg-linear-to-b from-white to-rose-50/20'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {task.type?.replace('_', ' ')}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                      {!isCompleted && !isOverdue && <Clock className="w-3.5 h-3.5" />}
                      <span>{task.assignment_status}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{task.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{task.description}</p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Deadline:</span>
                    <span className="font-bold text-slate-800">{formatDate(task.deadline)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isCompleted ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-emerald-700 font-medium">
                        Submitted on {formatDate(task.completed_at || task.submission_submitted_at)}
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
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-2xs flex items-center justify-center gap-1.5 ${
                        isOverdue
                          ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                          : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
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
