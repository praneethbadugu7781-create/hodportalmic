'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  ShieldCheck,
  User,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [role, setRole] = useState<'admin' | 'student'>('admin');
  const [identifier, setIdentifier] = useState('admin@department.edu');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleRoleToggle = (newRole: 'admin' | 'student') => {
    setRole(newRole);
    if (newRole === 'admin') {
      setIdentifier('admin@department.edu');
      setPassword('admin123');
    } else {
      setIdentifier('');
      setPassword('');
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, role }),
      });

      const data = await res.json();
      if (res.ok) {
        success(`Welcome, ${data.student?.name || data.user.username}!`);
        if (data.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/student');
        }
      } else {
        error(data.error || 'Invalid credentials');
      }
    } catch {
      error('An error occurred during authentication. Please check server and database connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* College Institutional Logo Header */}
      <div className="max-w-md w-full text-center mb-6 space-y-3">
        <div className="flex items-center justify-center">
          <img
            src="/logo-mic.png"
            alt="DVR & Dr. HS MIC College of Technology"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-xs"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            Department of Artificial Intelligence &amp; Machine Learning (AIML)
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
            Student Task Tracking &amp; Department Management Portal
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 sm:p-8 space-y-6">
        {/* Role Tab Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => handleRoleToggle('admin')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              role === 'admin'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Admin / Faculty</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleToggle('student')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              role === 'student'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-emerald-600" />
            <span>Student Portal</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {role === 'admin' ? 'Admin Email / Username' : 'Student Roll Number'}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === 'admin' ? 'admin@department.edu' : 'e.g. 24H71A6101'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              role === 'admin'
                ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-500/20'
            }`}
          >
            <span>{loading ? 'Authenticating...' : `Sign In as ${role === 'admin' ? 'Admin' : 'Student'}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <span className="font-bold text-slate-700">DVR & Dr. HS MIC College of Technology</span> • AIML Department
      </div>
    </div>
  );
}
