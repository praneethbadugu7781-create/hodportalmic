'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { AdminSidebar, AdminTab } from '@/components/admin/AdminSidebar';
import { DashboardKpis } from '@/components/admin/DashboardKpis';
import { TaskTracker } from '@/components/admin/TaskTracker';
import { StudentTable } from '@/components/admin/StudentTable';
import { AnalyticsView } from '@/components/admin/AnalyticsView';
import { TaskCreateModal } from '@/components/admin/TaskCreateModal';
import { BulkImportModal } from '@/components/admin/BulkImportModal';
import { PromotionModal } from '@/components/admin/PromotionModal';
import { StudentProfileModal } from '@/components/admin/StudentProfileModal';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import { AdminProfileModal } from '@/components/admin/AdminProfileModal';
import { Task } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { PlusCircle, Search, Filter, Archive, CheckCircle2, Clock, AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { success, error, info } = useToast();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');

  // Tasks & Metrics State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Modals
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [showAdminProfile, setShowAdminProfile] = useState(false);
  const [activeProfileStudentId, setActiveProfileStudentId] = useState<number | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeletingTask(true);
    try {
      const res = await fetch(`/api/tasks/${taskToDelete.id}?mode=permanent`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || `Task "${taskToDelete.title}" deleted.`);
        setTaskToDelete(null);
        if (selectedTaskId === taskToDelete.id) {
          setSelectedTaskId(null);
        }
        await Promise.all([fetchTasks(true), fetchStats()]);
      } else {
        error(data.error || 'Failed to delete task');
      }
    } catch {
      error('Failed to delete task');
    } finally {
      setIsDeletingTask(false);
    }
  };

  const checkAuthAndLoadData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();

      if (!meRes.ok || !meData.authenticated) {
        router.push('/faculty');
        return;
      }

      if (meData.user?.role !== 'admin') {
        router.push('/student');
        return;
      }

      setUser(meData.user);
      setLoading(false);
      // Fetch tasks and stats in parallel without blocking UI
      fetchTasks();
      fetchStats();
    } catch {
      router.push('/');
      setLoading(false);
    }
  };

  const fetchTasks = async (showToast = false) => {
    setTasksLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks || []);
        if (data.tasks?.length > 0) {
          setSelectedTaskId((prev) => (prev ? prev : data.tasks[0].id));
        }
      }
    } catch {
      if (showToast) error('Failed to load tasks');
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      if (res.ok) {
        setStats(data.summary);
      }
    } catch {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  };

  const handleKpiCardClick = (type: 'students' | 'completed' | 'pending' | 'tasks' | 'overdue') => {
    if (type === 'students') {
      setCurrentTab('students');
    } else if (type === 'tasks') {
      setCurrentTab('tasks');
    } else {
      setCurrentTab('dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        Authenticating Department Administration...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        user={user}
        currentSession="2026-27"
        onRefresh={() => {
          fetchTasks();
          fetchStats();
          info('Data refreshed');
        }}
        onOpenProfile={() => setShowAdminProfile(true)}
      />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <AdminSidebar
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
          onOpenCreateTask={() => setShowCreateTask(true)}
          onOpenImport={() => setShowImportModal(true)}
          counts={{
            activeTasks: stats?.totalActiveTasks || tasks.length,
            totalStudents: stats?.totalStudents,
            pendingCount: stats?.totalPending,
          }}
          onOpenProfile={() => setShowAdminProfile(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          {/* Top 10-Second KPI Dashboard */}
          <DashboardKpis
            totalStudents={stats?.totalStudents || 0}
            totalCompleted={stats?.totalCompleted || 0}
            totalPending={stats?.totalPending || 0}
            totalActiveTasks={stats?.totalActiveTasks || tasks.length}
            totalOverdue={stats?.totalOverdue || 0}
            overallRate={stats?.overallCompletionRate || 0}
            loading={statsLoading && !stats}
            onCardClick={handleKpiCardClick}
          />

          {/* TAB 1: DASHBOARD (Central Task Tracker) */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              <TaskTracker
                tasks={tasks}
                tasksLoading={tasksLoading && tasks.length === 0}
                selectedTaskId={selectedTaskId}
                onSelectTask={(id) => setSelectedTaskId(id)}
                onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                onTaskDeleted={() => {
                  setSelectedTaskId(null);
                  Promise.all([fetchTasks(true), fetchStats()]);
                }}
              />
            </div>
          )}

          {/* TAB 2: TASKS MANAGEMENT */}
          {currentTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900 font-display">Task Management</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Create, edit, assign, delete, and review department activities
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Task</span>
                </button>
              </div>

              {/* Grid of Task Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md">
                          {task.type.replace('_', ' ')}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            task.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : task.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {task.priority} Priority
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base font-display">{task.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                        {task.description}
                      </p>

                      <div className="text-xs text-slate-500 pt-1">
                        Deadline: <span className="font-bold text-slate-800">{formatDate(task.deadline)}</span>
                      </div>

                      <div className="space-y-1 pt-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-600">Completion</span>
                          <span className="text-blue-600">{task.completion_rate}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${task.completion_rate}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 pt-0.5 font-medium">
                          <span>{task.total_assigned} Assigned</span>
                          <span className="text-emerald-600 font-semibold">{task.completed_count} Done</span>
                          <span className="text-amber-600 font-semibold">{task.pending_count} Pending</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setTaskToDelete(task)}
                        className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-rose-200/80 hover:border-rose-300"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setCurrentTab('dashboard');
                        }}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        <span>Track & Copy Roll Numbers</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: STUDENTS DIRECTORY */}
          {currentTab === 'students' && (
            <StudentTable
              onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
              onRefreshStats={() => {
                fetchStats();
                fetchTasks();
              }}
            />
          )}

          {/* TAB 4: ACADEMIC PROMOTION */}
          {currentTab === 'promotion' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6 text-center">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                  <Archive className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Academic Year Transition & Promotion</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Advance 2nd Year students to 3rd Year, 3rd Year to Final Year, and safely archive Final Year students into the Graduated directory with complete historical audit preservation.
                </p>
                <button
                  onClick={() => setShowPromotionModal(true)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
                >
                  Start Promotion Review
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS & REPORTS */}
          {currentTab === 'analytics' && <AnalyticsView />}

          {/* TAB 6: ARCHIVED / GRADUATED STUDENTS */}
          {currentTab === 'archived' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs text-indigo-900">
                <span className="font-bold block">📦 Graduated & Archived Alumni Directory</span>
                Profiles, submitted documents, and task histories of graduated final-year batches remain permanently accessible.
              </div>
              <StudentTable
                onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                onRefreshStats={() => {
                  fetchStats();
                  fetchTasks();
                }}
              />
            </div>
          )}

          {/* TAB 7: SYSTEM AUDIT LOG */}
          {currentTab === 'audit' && <AnalyticsView />}
        </main>
      </div>

      {/* Global Modals */}
      <TaskCreateModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onTaskCreated={() => {
          fetchTasks();
          fetchStats();
        }}
      />

      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          fetchTasks();
          fetchStats();
        }}
      />

      <PromotionModal
        isOpen={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
        onPromotionSuccess={() => {
          fetchTasks();
          fetchStats();
        }}
      />

      <StudentProfileModal
        studentId={activeProfileStudentId}
        onClose={() => setActiveProfileStudentId(null)}
        onStudentDeleted={() => {
          fetchStats();
          fetchTasks();
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!taskToDelete}
        title="Delete Department Task"
        itemName={taskToDelete ? `📌 ${taskToDelete.title}` : ''}
        itemDescription={taskToDelete?.description}
        warningText="Permanently deleting this task will remove the task, all assigned student records, and all uploaded proof files/submissions from MongoDB Atlas. This action cannot be undone."
        confirmLabel="Yes, Delete Task"
        isDeleting={isDeletingTask}
        onConfirm={handleDeleteTask}
        onClose={() => setTaskToDelete(null)}
      />

      <AdminProfileModal
        isOpen={showAdminProfile}
        onClose={() => setShowAdminProfile(false)}
        user={user}
        onUpdate={(updated) => {
          setUser((prev: any) => ({
            ...prev,
            ...updated,
          }));
        }}
      />
    </div>
  );
}
