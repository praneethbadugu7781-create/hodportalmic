'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ExternalLink,
  GraduationCap,
  History,
  X,
  Download,
  Trash2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '../ui/Toast';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface StudentProfileModalProps {
  studentId: number | null;
  onClose: () => void;
  onStudentDeleted?: () => void;
}

export function StudentProfileModal({ studentId, onClose, onStudentDeleted }: StudentProfileModalProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (studentId) {
      fetchProfile(studentId);
    }
  }, [studentId]);

  const fetchProfile = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${id}`);
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        error(result.error || 'Failed to load student profile');
      }
    } catch {
      error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!student) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/students/${student._id || student.id}?mode=permanent`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (res.ok) {
        success(result.message || `Student ${student.roll_number} deleted.`);
        setShowDeleteModal(false);
        onClose();
        onStudentDeleted?.();
      } else {
        error(result.error || 'Failed to delete student');
      }
    } catch {
      error('Failed to delete student');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!studentId) return null;

  const student = data?.student;
  const assignments: any[] = data?.assignments || [];
  const history: any[] = data?.history || [];
  const metrics = data?.metrics || {
    totalAssigned: 0,
    completedCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    completionRate: 0,
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20">
              {student ? student.name.charAt(0) : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 font-display">{student?.name || 'Student Profile'}</h2>
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {student?.roll_number}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {student?.year} • Section {student?.section} • {student?.department}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {student && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                title="Permanently Delete Student"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading student profile...</div>
          ) : (
            <>
              {/* Profile Details & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Contact Email</div>
                  <div className="text-xs font-semibold text-slate-800 mt-1 truncate">{student?.email}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Phone Number</div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">{student?.phone || 'Not provided'}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Account Status</div>
                  <div className="mt-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        student?.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : student?.status === 'DISABLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {student?.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Assigned</div>
                  <div className="text-xl font-bold text-blue-900 mt-1">{metrics.totalAssigned}</div>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Completed</div>
                  <div className="text-xl font-bold text-emerald-900 mt-1">{metrics.completedCount}</div>
                </div>

                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending</div>
                  <div className="text-xl font-bold text-amber-900 mt-1">{metrics.pendingCount}</div>
                </div>

                <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Overdue</div>
                  <div className="text-xl font-bold text-rose-900 mt-1">{metrics.overdueCount}</div>
                </div>
              </div>

              {/* Task History Table */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Task Submission History</span>
                </h4>

                {assignments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    No tasks assigned to this student yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="p-3">Task Title</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Deadline</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Proof / Response</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assignments.map((a) => {
                          const isDone = a.assignment_status === 'COMPLETED';
                          const isOver = a.assignment_status === 'OVERDUE';
                          return (
                            <tr key={a.assignment_id} className="hover:bg-slate-50/60">
                              <td className="p-3 font-semibold text-slate-900 max-w-xs">{a.task_title}</td>
                              <td className="p-3 text-slate-500">{a.task_type?.replace('_', ' ')}</td>
                              <td className="p-3 text-slate-600">{formatDate(a.task_deadline)}</td>
                              <td className="p-3">
                                <span
                                  className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] ${
                                    isDone
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isOver
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                  {isOver && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                  {a.assignment_status}
                                </span>
                              </td>
                              <td className="p-3">
                                {a.submission_file_url ? (
                                  <a
                                    href={a.submission_file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>{a.submission_file_name || 'Proof'}</span>
                                    <Download className="w-3 h-3 ml-0.5" />
                                  </a>
                                ) : a.submission_response ? (
                                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm">
                                    {a.submission_response}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Academic Progression History */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Academic History</span>
                </h4>

                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div
                      key={h.id || i}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Session {h.academic_session}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">{h.year} (Section {h.section})</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {h.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {student ? (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 text-xs font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Student Record</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirm Delete Student Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        title="Delete Student Account"
        itemName={student ? `👤 ${student.roll_number} - ${student.name}` : ''}
        itemDescription={`${student?.year} • Section ${student?.section} • ${student?.email}`}
        warningText="Permanently deleting this student will delete their profile, user credentials, and all their task submission history from MongoDB Atlas. This action cannot be undone."
        confirmLabel="Yes, Delete Student"
        isDeleting={isDeleting}
        onConfirm={handleDeleteStudent}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
