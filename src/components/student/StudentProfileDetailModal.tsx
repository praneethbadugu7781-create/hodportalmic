'use client';

import React from 'react';
import {
  X,
  User,
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Building,
  ExternalLink,
  Award,
} from 'lucide-react';
import { Student } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface StudentProfileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  tasks?: any[];
}

export const StudentProfileDetailModal: React.FC<StudentProfileDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  tasks = [],
}) => {
  if (!isOpen || !student) return null;

  const totalAssigned = tasks.length;
  const completedTasks = tasks.filter((t) => t.assignment_status === 'COMPLETED');
  const pendingTasks = tasks.filter((t) => t.assignment_status === 'PENDING' || t.assignment_status === 'OVERDUE');
  const completionRate = totalAssigned > 0 ? Math.round((completedTasks.length / totalAssigned) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with College & Student Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 sm:gap-4 pr-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-lg flex items-center justify-center shrink-0">
              <img
                src="/logo-mic.png"
                alt="MIC College Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-blue-200 bg-blue-500/30 px-2.5 py-0.5 rounded-full border border-blue-400/20 inline-block mb-1">
                Student Profile
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate leading-tight">
                {student.name}
              </h2>
              <p className="text-xs text-blue-200 font-medium truncate">
                <span className="font-bold text-white uppercase">{student.roll_number}</span> • {student.year} ({student.section})
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3.5 rounded-2xl text-center">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block">Assigned</span>
              <span className="text-lg sm:text-xl font-black text-slate-900">{totalAssigned}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-2.5 sm:p-3.5 rounded-2xl text-center">
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 block">Completed</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700">{completedTasks.length}</span>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-2.5 sm:p-3.5 rounded-2xl text-center">
              <span className="text-[10px] sm:text-xs font-semibold text-blue-600 block">Progress</span>
              <span className="text-lg sm:text-xl font-black text-blue-700">{completionRate}%</span>
            </div>
          </div>

          {/* Academic & Personal Details */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              Academic &amp; Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <Building className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Institution</span>
                  <span className="font-bold text-slate-800">DVR &amp; Dr. HS MIC College of Technology</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <GraduationCap className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Department</span>
                  <span className="font-bold text-slate-800">{student.department}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Year &amp; Section</span>
                  <span className="font-bold text-slate-800">{student.year} • Section {student.section}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Award className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Academic Session</span>
                  <span className="font-bold text-slate-800">{student.academic_session}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500 block">College Email</span>
                  <span className="font-bold text-slate-800 break-all">{student.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Contact Number</span>
                  <span className="font-bold text-slate-800">{student.phone || 'Not Registered'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:col-span-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Enrollment Status</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md text-[11px]">
                    ● {student.status} (Verified)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity / Submissions History */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              My Submissions History ({completedTasks.length})
            </h3>

            {completedTasks.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No submissions completed yet.
              </div>
            ) : (
              <div className="space-y-2">
                {completedTasks.map((t) => (
                  <div
                    key={t.id || t.assignment_id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{t.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        {formatDate(t.completed_at || t.submission_submitted_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {t.submission_file_url && (
                        <a
                          href={t.submission_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          <span>Proof</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                        Verified
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
