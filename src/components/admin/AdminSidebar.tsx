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
  ShieldCheck,
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
  onOpenProfile?: () => void;
}

export function AdminSidebar({
  currentTab,
  onTabChange,
  onOpenCreateTask,
  onOpenImport,
  counts,
  onOpenProfile,
}: AdminSidebarProps) {
  const navItems: { id: AdminTab; label: string; icon: React.ElementType; badge?: number | string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks & Tracking', icon: CheckSquare, badge: counts?.activeTasks },
    { id: 'students', label: 'Student Directory', icon: Users, badge: counts?.totalStudents },
    { id: 'promotion', label: 'Promotion', icon: GraduationCap },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'archived', label: 'Archive', icon: Archive },
    { id: 'audit', label: 'Audit Log', icon: History },
  ];

  return (
    <aside className="w-full lg:w-64 bg-white/90 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-slate-200/80 lg:min-h-[calc(100vh-5rem)] p-3 sm:p-4 flex flex-col justify-between shrink-0 shadow-xs">
      <div className="space-y-4 lg:space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-2.5">
          <button
            onClick={onOpenCreateTask}
            className="w-full group flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold shadow-md shadow-blue-500/20 text-xs sm:text-sm cursor-pointer transition-all"
          >
            <PlusCircle className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300 shrink-0" />
            <span className="truncate">Create Task</span>
          </button>

          <button
            onClick={onOpenImport}
            className="w-full flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-50 hover:bg-slate-100/80 text-slate-700 border border-slate-200/90 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl font-semibold transition-all text-xs hover:border-slate-300 shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">Bulk Import</span>
          </button>
        </div>

        {/* Navigation Menu (Horizontal scroll on mobile, Vertical stack on desktop) */}
        <nav className="space-y-1">
          <div className="hidden lg:block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3.5 pb-2">
            Main Management
          </div>
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center justify-between gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 lg:shrink lg:w-full ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold shadow-xs border border-blue-200/50'
                      : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900 bg-white/60 lg:bg-transparent border border-slate-200/60 lg:border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge !== null && (
                    <span
                      className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-extrabold transition-colors ${
                        isActive ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* HOD Profile & Credentials Quick Access */}
      {onOpenProfile && (
        <div className="pt-3 mt-3 border-t border-slate-200/80 hidden lg:block">
          <button
            onClick={onOpenProfile}
            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-200 text-slate-700 hover:text-blue-700 transition-all text-xs font-bold group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-extrabold text-slate-900 group-hover:text-blue-700 text-xs">HOD Profile</div>
                <div className="text-[10px] text-slate-400 font-normal">Security &amp; Password</div>
              </div>
            </div>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              Edit
            </span>
          </button>
        </div>
      )}
    </aside>
  );
}
