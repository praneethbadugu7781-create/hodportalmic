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

export default function StudentLoginPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      error('Please enter both your roll number and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim().toUpperCase(), password, role: 'student' }),
      });

      const data = await res.json();
      if (res.ok) {
        success(`Welcome, ${data.student?.name || data.user.username}!`);
        router.push('/student');
      } else {
        error(data.error || 'Invalid credentials');
      }
    } catch {
      error('An error occurred during authentication. Please check network connection.');
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
            Student Task Tracking &amp; Academic Management Portal
          </p>
        </div>
      </div>

      {/* Main Student Login Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <User className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Student Sign In</h3>
              <p className="text-[11px] text-slate-500 font-medium">Access your department tasks & submissions</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-800 uppercase tracking-wider">
            Student
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Student Roll Number
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                placeholder="e.g. 24H71A6101"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold tracking-wide uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
                placeholder="Default: Roll Number (e.g. 24H71A6101)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 space-y-1.5 shadow-xs">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              First Time Logging In?
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Enter your <span className="font-semibold text-emerald-900">Roll Number</span> as both username and password. You will be prompted to verify your official college email (<code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono text-[10px]">@mictech.edu.in</code>) with an OTP and set your personal password.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-500/20 disabled:opacity-60"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Student Portal'}</span>
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
