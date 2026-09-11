'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ShaderSubmitButton } from '@/components/ui/ShaderSubmitButton';
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
      error('Please enter both your faculty username/email and password');
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
      error('An error occurred during authentication. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans">
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
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight font-outfit">
            Department of Artificial Intelligence &amp; Machine Learning (AIML)
          </h2>
          <p className="text-[11px] sm:text-xs text-blue-700 font-bold uppercase tracking-wider mt-0.5">
            Faculty &amp; Department Administration Portal
          </p>
        </div>
      </div>

      {/* Main Faculty Login Card - High Level Clean Institutional Design */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-outfit">
                Faculty &amp; HOD Sign In
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Authorized administration access</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
            Admin
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Admin Email / Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@department.edu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden transition-all shadow-2xs"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden transition-all shadow-2xs"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Liquid Metal Shader Submit Button */}
          <div className="pt-2">
            <ShaderSubmitButton
              label="Sign In as Administrator"
              loading={loading}
              disabled={loading}
            />
          </div>
        </form>

        <div className="pt-2 text-center border-t border-slate-100">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Student Portal</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <span className="font-bold text-slate-700">DVR &amp; Dr. HS MIC College of Technology</span> • AIML Department Management
      </div>
    </div>
  );
}
