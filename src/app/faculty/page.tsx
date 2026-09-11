'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lock, Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

export default function FacultyLoginPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      error('Please enter both your faculty email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password, role: 'admin' }),
      });

      const data = await res.json();
      if (res.ok) {
        success(`Welcome, Department Administrator!`);
        router.push('/admin');
      } else {
        error(data.error || 'Invalid administrator credentials');
      }
    } catch {
      error('Authentication error occurred. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* College Institutional Logo Header */}
      <div className="max-w-md w-full text-center mb-6 space-y-3 z-10">
        <div className="flex items-center justify-center">
          <div className="bg-white/95 p-3 rounded-2xl shadow-lg inline-block">
            <img
              src="/logo-mic.png"
              alt="DVR & Dr. HS MIC College of Technology"
              className="h-14 sm:h-16 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
            Department of Artificial Intelligence &amp; Machine Learning (AIML)
          </h2>
          <p className="text-[11px] sm:text-xs text-blue-300 font-semibold mt-0.5 uppercase tracking-wider">
            Faculty &amp; Administration Portal
          </p>
        </div>
      </div>

      {/* Main Admin Card */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl max-w-md w-full p-6 sm:p-8 space-y-6 z-10">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-white">Faculty &amp; HOD Sign In</h3>
              <p className="text-[11px] text-slate-400 font-medium">Authorized staff access only</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 uppercase tracking-wider border border-blue-500/30">
            Admin
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Faculty Email or Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@department.edu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 text-white placeholder-slate-500 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden transition-all"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 text-white placeholder-slate-500 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden transition-all"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-500/20 disabled:opacity-60 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In as Administrator'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-700/60">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Student Portal</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500 z-10">
        <span className="font-bold text-slate-400">DVR &amp; Dr. HS MIC College of Technology</span> • AIML Department Management
      </div>
    </div>
  );
}
