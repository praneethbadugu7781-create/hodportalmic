'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck, User as UserIcon, RefreshCw, UserCheck } from 'lucide-react';
import { useToast } from './ui/Toast';

interface NavbarProps {
  user: {
    id: number | string;
    username: string;
    email: string;
    role: 'admin' | 'student';
  } | null;
  student?: {
    roll_number: string;
    name: string;
    year: string;
    section: string;
  } | null;
  currentSession?: string;
  onRefresh?: () => void;
  onOpenProfile?: () => void;
}

export function Navbar({ user, student, currentSession = '2026-27', onRefresh, onOpenProfile }: NavbarProps) {
  const router = useRouter();
  const { success, error } = useToast();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      success('Logged out successfully');
      router.push('/');
      router.refresh();
    } catch {
      error('Failed to logout');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo + Department Title (No duplicate college text) */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 sm:h-12 w-auto flex items-center justify-center shrink-0">
              <img
                src="/logo-mic.png"
                alt="MIC College of Technology"
                className="h-9 sm:h-11 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Department of Artificial Intelligence &amp; Machine Learning (AIML)
                </span>
                <span className="hidden sm:inline-flex bg-blue-50 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
                  {currentSession}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                HOD Task Tracking &amp; Student Management Portal
              </p>
            </div>
          </div>

          {/* User Section & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh Data"
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {user && (
              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
                {user.role === 'student' && onOpenProfile && (
                  <button
                    onClick={onOpenProfile}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">My Profile</span>
                  </button>
                )}

                <div
                  onClick={user.role === 'student' && onOpenProfile ? onOpenProfile : undefined}
                  className={`text-right hidden sm:block ${user.role === 'student' && onOpenProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                >
                  <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    {user.role === 'admin' ? 'Prof. HOD (Admin)' : student?.name || user.username}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1 font-medium">
                    {user.role === 'admin' ? (
                      <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" /> Head of Department
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                        <UserIcon className="w-3 h-3" /> {student?.roll_number} • {student?.year} ({student?.section})
                      </span>
                    )}
                  </div>
                </div>

                <div
                  onClick={user.role === 'student' && onOpenProfile ? onOpenProfile : undefined}
                  className={`w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm ${user.role === 'student' && onOpenProfile ? 'cursor-pointer hover:border-blue-400' : ''}`}
                >
                  {user.role === 'admin' ? 'HOD' : student?.name ? student.name[0] : 'S'}
                </div>

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="flex items-center gap-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
