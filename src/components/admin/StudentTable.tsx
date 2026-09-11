'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  Eye,
  Edit2,
  UserX,
  UserCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Student } from '@/lib/types';
import { useToast } from '../ui/Toast';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface StudentTableProps {
  onOpenStudentProfile: (studentId: number) => void;
  onRefreshStats?: () => void;
}

export function StudentTable({ onOpenStudentProfile, onRefreshStats }: StudentTableProps) {
  const { success, error } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selection & Delete state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Add/Edit Student modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    roll_number: '',
    name: '',
    email: '',
    phone: '',
    year: '2nd Year',
    section: 'A',
    department: 'Artificial Intelligence & Machine Learning',
    password: '',
  });

  const handleToggleSelect = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = () => {
    const pageIds = students.map((s) => s.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeletingStudent(true);
    try {
      const res = await fetch(`/api/students/${studentToDelete.id}?mode=permanent`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || `Student ${studentToDelete.roll_number} deleted.`);
        setStudentToDelete(null);
        setSelectedStudentIds((prev) => prev.filter((id) => id !== studentToDelete.id));
        fetchStudents();
        onRefreshStats?.();
      } else {
        error(data.error || 'Failed to delete student');
      }
    } catch {
      error('Failed to delete student');
    } finally {
      setIsDeletingStudent(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/students/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudentIds }),
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || `Deleted ${selectedStudentIds.length} students.`);
        setSelectedStudentIds([]);
        setShowBulkDeleteModal(false);
        fetchStudents();
        onRefreshStats?.();
      } else {
        error(data.error || 'Failed to delete students');
      }
    } catch {
      error('Failed to delete students');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, yearFilter, sectionFilter, statusFilter, page]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        year: yearFilter,
        section: sectionFilter,
        status: statusFilter,
        page: page.toString(),
        limit: '15',
      });
      const res = await fetch(`/api/students?${query}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      } else {
        error(data.error || 'Failed to load students');
      }
    } catch {
      error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        // Update
        const res = await fetch(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
          success('Student details updated successfully');
          setShowAddModal(false);
          setEditingStudent(null);
          fetchStudents();
          onRefreshStats?.();
        } else {
          error(data.error || 'Failed to update student');
        }
      } else {
        // Create
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
          success('Student added successfully!');
          setShowAddModal(false);
          resetForm();
          fetchStudents();
          onRefreshStats?.();
        } else {
          error(data.error || 'Failed to add student');
        }
      }
    } catch {
      error('An unexpected error occurred');
    }
  };

  const handleToggleStatus = async (student: any) => {
    const newStatus = student.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const actionName = newStatus === 'ACTIVE' ? 'enable' : 'disable';

    if (!confirm(`Are you sure you want to ${actionName} account for ${student.roll_number} (${student.name})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        success(`Student account ${newStatus.toLowerCase()}d successfully`);
        fetchStudents();
        onRefreshStats?.();
      } else {
        error('Failed to change status');
      }
    } catch {
      error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      roll_number: '',
      name: '',
      email: '',
      phone: '',
      year: '2nd Year',
      section: 'A',
      department: 'Artificial Intelligence & Machine Learning',
      password: '',
    });
    setEditingStudent(null);
  };

  const openEdit = (s: any) => {
    setEditingStudent(s);
    setFormData({
      roll_number: s.roll_number,
      name: s.name,
      email: s.email,
      phone: s.phone || '',
      year: s.year,
      section: s.section,
      department: s.department,
      password: '',
    });
    setShowAddModal(true);
  };

  const handleExportCSV = () => {
    if (students.length === 0) {
      error('No student data to export');
      return;
    }
    const headers = ['Roll Number', 'Name', 'Email', 'Phone', 'Year', 'Section', 'Status', 'Tasks Assigned', 'Tasks Completed'];
    const rows = students.map((s) => [
      s.roll_number,
      s.name,
      s.email,
      s.phone || '',
      s.year,
      s.section,
      s.status,
      s.total_assigned_tasks || 0,
      s.completed_tasks_count || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Student list exported successfully');
  };

  const handleExportPDF = async () => {
    try {
      const query = new URLSearchParams({
        search,
        year: yearFilter,
        section: sectionFilter,
        status: statusFilter,
        limit: '500',
      });
      const res = await fetch(`/api/students?${query}`);
      const data = await res.json();
      if (res.ok && data.students) {
        const { exportStudentsPdf } = await import('@/lib/pdf-export');
        await exportStudentsPdf(data.students, {
          year: yearFilter !== 'all' ? yearFilter : 'All Years',
          section: sectionFilter !== 'all' ? `Section ${sectionFilter}` : 'All Sections',
          status: statusFilter !== 'all' ? statusFilter : 'Active',
        });
        success('Official MIC Student Directory PDF generated!');
      }
    } catch {
      error('Failed to generate PDF');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Student Directory</h2>
          <p className="text-xs text-slate-500">
            Total {totalCount} registered students in department
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedStudentIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer animate-in fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedStudentIds.length})</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by roll number, name, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700"
          >
            <option value="all">All Years</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="Final Year">Final Year</option>
          </select>

          <select
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700"
          >
            <option value="all">All Sections (A &amp; B)</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700"
          >
            <option value="ACTIVE">Active Only</option>
            <option value="DISABLED">Disabled Only</option>
            <option value="GRADUATED">Graduated</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading student directory...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No students found matching current filters.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && students.every((s) => selectedStudentIds.includes(s.id))}
                    onChange={handleSelectAllOnPage}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Select all on this page"
                  />
                </th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-4">Year & Section</th>
                <th className="py-3 px-4">Tasks Status</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => {
                const totalAssigned = s.total_assigned_tasks || 0;
                const completed = s.completed_tasks_count || 0;
                const pending = s.pending_tasks_count || 0;
                const overdue = s.overdue_tasks_count || 0;
                const rate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
                const isSelected = selectedStudentIds.includes(s.id);

                return (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(s.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-black text-slate-900 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-md text-xs shadow-2xs">
                        {s.roll_number}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 text-sm font-display">{s.name}</div>
                      <div className="text-xs text-slate-500 font-medium">{s.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-bold text-slate-800">{s.year}</div>
                      <div className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 inline-block px-2 py-0.5 rounded-md mt-0.5">
                        Sec {s.section}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-800">{rate}%</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                        <span className="text-emerald-600 font-bold">{completed} Done</span>
                        <span>•</span>
                        <span className="text-amber-600 font-bold">{pending + overdue} Pending</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : s.status === 'DISABLED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenStudentProfile(s.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="View Profile & History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Student"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(s)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            s.status === 'ACTIVE'
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={s.status === 'ACTIVE' ? 'Disable Account' : 'Enable Account'}
                        >
                          {s.status === 'ACTIVE' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => setStudentToDelete(s)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Permanently Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing page <span className="font-bold text-slate-800">{page}</span> of{' '}
          <span className="font-bold text-slate-800">{totalPages}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingStudent ? `Edit Student: ${editingStudent.roll_number}` : 'Add New Student'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStudent}
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm disabled:bg-slate-100"
                    placeholder="e.g. 6148"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    placeholder="e.g. Aarav Sharma"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    placeholder="aarav.6148@department.edu"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Academic Year *
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="Final Year">Final Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Section *
                  </label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                  </select>
                </div>
              </div>

              {!editingStudent && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Password (Default: student123)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                    placeholder="student123"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {editingStudent ? 'Save Changes' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Student Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!studentToDelete}
        title="Delete Student Account"
        itemName={studentToDelete ? `👤 ${studentToDelete.roll_number} - ${studentToDelete.name}` : ''}
        itemDescription={`${studentToDelete?.year} • Section ${studentToDelete?.section} • ${studentToDelete?.email}`}
        warningText="Permanently deleting this student will remove their profile, user credentials, and all their task submission history from MongoDB Atlas. This action cannot be undone."
        confirmLabel="Yes, Delete Student"
        isDeleting={isDeletingStudent}
        onConfirm={handleDeleteStudent}
        onClose={() => setStudentToDelete(null)}
      />

      {/* Bulk Delete Students Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showBulkDeleteModal}
        title="Bulk Delete Students"
        itemName={`🗑️ ${selectedStudentIds.length} Students Selected`}
        itemDescription={`Permanently removing ${selectedStudentIds.length} students from the department database.`}
        warningText={`This will permanently delete all ${selectedStudentIds.length} selected students, their login accounts, and all submitted proofs from MongoDB Atlas. This cannot be undone.`}
        confirmLabel={`Yes, Delete ${selectedStudentIds.length} Students`}
        isDeleting={isBulkDeleting}
        onConfirm={handleBulkDelete}
        onClose={() => setShowBulkDeleteModal(false)}
      />
    </div>
  );
}
