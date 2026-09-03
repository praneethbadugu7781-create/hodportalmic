'use client';

import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  GraduationCap,
  BarChart3,
  Archive,
  History,
  PlusCircle,
  Upload,
  Sparkles,
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'tasks' | 'students' | 'promotion' | 'analytics' | 'archived' | 'audit';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onOpenCreateTask: () => void;
  onOpenImport: () => void;
  counts?: {
    activeTasks?: number;
    totalStudents?: number;
    pendingCount?: number;
  };
}

export function AdminSidebar({
  currentTab,
  onTabChange,
  onOpenCreateTask,
  onOpenImport,
  counts,
}: AdminSidebarProps) {
  const navItems: { id: AdminTab; label: string; icon: React.ElementType; badge?: number | string }[] = [
    { id: 'dashboard', label: 'Department Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks & Tracking', icon: CheckSquare, badge: counts?.activeTasks },
    { id: 'students', label: 'Student Directory', icon: Users, badge: counts?.totalStudents },
    { id: 'promotion', label: 'Academic Promotion', icon: GraduationCap },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'archived', label: 'Graduated / Archive', icon: Archive },
    { id: 'audit', label: 'System Audit Log', icon: History },
  ];

  return (
    <aside className="w-full lg:w-64 bg-white/90 backdrop-blur-md border-r border-slate-200/80 lg:min-h-[calc(100vh-5rem)] p-4 flex flex-col justify-between shrink-0 shadow-xs">
      <div className="space-y-6">
        {/* Quick Actions with Premium Glow */}
        <div className="space-y-2.5">
          <button
            onClick={onOpenCreateTask}
            className="w-full group flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all text-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
            <span>Create New Task</span>
          </button>

          <button
            onClick={onOpenImport}
            className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100/80 text-slate-700 border border-slate-200/90 px-4 py-2.5 rounded-2xl font-semibold transition-all text-xs hover:border-slate-300 shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Bulk Import Students</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3.5 pb-2">
            Main Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-bold shadow-xs border border-blue-200/50'
                    : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge !== null && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold transition-colors ${
                      isActive ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
