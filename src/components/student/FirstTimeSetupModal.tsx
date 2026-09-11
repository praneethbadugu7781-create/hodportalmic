'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mail, KeyRound, Lock, CheckCircle2, ArrowRight, Clock, Eye, EyeOff, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

interface FirstTimeSetupModalProps {
  student: {
    roll_number: string;
    name: string;
    email?: string;
  } | null;
  onComplete: () => void;
}

export function FirstTimeSetupModal({ student, onComplete }: FirstTimeSetupModalProps) {
  const router = useRouter();
  const { success, error } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [collegeEmail, setCollegeEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Pre-fill email if existing student has a @mictech.edu.in email
  useEffect(() => {
    if (student?.email && student.email.endsWith('@mictech.edu.in')) {
      setCollegeEmail(student.email.toLowerCase());
    } else if (student?.roll_number) {
      // Convenience suggestion
      setCollegeEmail(`${student.roll_number.toLowerCase()}@mictech.edu.in`);
    }
  }, [student]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch {
      router.push('/');
    }
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = collegeEmail.trim().toLowerCase();

    if (!cleanEmail) {
      error('Please enter your college email address');
      return;
    }

    if (!cleanEmail.endsWith('@mictech.edu.in')) {
      error('College email must end with @mictech.edu.in');
      return;
    }

    setLoading(true);
    setDevOtpNotice(null);
    try {
      const res = await fetch('/api/auth/student-setup/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ college_email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Failed to send OTP. Please try again.');
        return;
      }

      success(data.message || 'OTP sent successfully!');
      if (data.devOtp) {
        setDevOtpNotice(`Dev Mode Simulated OTP: ${data.devOtp}`);
      }

      setStep(2);
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch {
      error('Network error while requesting OTP. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // OTP inputs auto-advance
  const handleOtpChange = (index: number, val: string) => {
    const numericVal = val.replace(/\D/g, '').slice(-1);
    const updated = [...otp];
    updated[index] = numericVal;
    setOtp(updated);

    if (numericVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!paste) return;
    const updated = [...otp];
    for (let i = 0; i < paste.length; i++) {
      updated[i] = paste[i];
    }
    setOtp(updated);
    const nextFocusIndex = Math.min(paste.length, 5);
    otpInputsRef.current[nextFocusIndex]?.focus();
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      error('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/student-setup/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          college_email: collegeEmail.trim().toLowerCase(),
          otp: fullOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Invalid OTP code.');
        return;
      }

      success('Email verified successfully! Now set your new password.');
      setStep(3);
    } catch {
      error('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set Password
  const handleSetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (newPassword.length < 6) {
      error('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword === student?.roll_number?.toUpperCase() || newPassword === student?.roll_number?.toLowerCase()) {
      error('New password cannot be your roll number for security.');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('Passwords do not match. Please re-type carefully.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/student-setup/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          college_email: collegeEmail.trim().toLowerCase(),
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Failed to update password.');
        return;
      }

      success('Account setup completed successfully! Welcome to your portal.');
      onComplete();
    } catch {
      error('An error occurred setting your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header with institution banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                Security Onboarding
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-white/80 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              title="Logout from this account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            First-Time Account Setup
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-medium">
            Welcome, <span className="font-bold text-white">{student?.name || 'Student'}</span> ({student?.roll_number}). Please verify your college email and set a personal password to unlock your portal.
          </p>

          {/* Step Progress Dots */}
          <div className="flex items-center gap-2 sm:gap-3 mt-5">
            {[
              { num: 1, label: 'Email' },
              { num: 2, label: 'OTP' },
              { num: 3, label: 'Password' },
            ].map((s) => (
              <div key={s.num} className="flex-1 flex flex-col gap-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s.num ? 'bg-white' : 'bg-white/20'
                  }`}
                />
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    step >= s.num ? 'text-white' : 'text-white/50'
                  }`}
                >
                  Step {s.num}: {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {devOtpNotice && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-mono text-amber-900 flex items-center justify-between">
              <span>{devOtpNotice}</span>
              <button
                type="button"
                onClick={() => {
                  const match = devOtpNotice.match(/\d{6}/);
                  if (match) {
                    const digits = match[0].split('');
                    setOtp(digits);
                  }
                }}
                className="text-[11px] font-bold underline text-amber-800 hover:text-amber-950 ml-2 cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
          )}

          {/* STEP 1: Email Form */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-emerald-600" />
                  Enter Official College Email
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Provide your official college email ID ending with <span className="font-semibold text-slate-800">@mictech.edu.in</span>. A one-time verification code will be sent to this address.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Institutional College Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={collegeEmail}
                    onChange={(e) => setCollegeEmail(e.target.value)}
                    placeholder="your-rollno@mictech.edu.in"
                    className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden transition-all shadow-xs"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Must end with <span className="font-mono text-slate-600">@mictech.edu.in</span>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <span>{loading ? 'Sending OTP Code...' : 'Send Verification OTP'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: OTP Form */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-600" />
                  Enter 6-Digit Verification Code
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  We sent a 6-digit code to{' '}
                  <span className="font-bold text-slate-800 underline">{collegeEmail}</span>. Please check your inbox or spam folder.
                </p>
              </div>

              {/* 6 Digit Inputs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Security OTP Code
                </label>
                <div className="flex items-center justify-between gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-2xl border-2 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden transition-all shadow-xs"
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons: Resend + Change Email */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer underline underline-offset-2"
                >
                  Change Email
                </button>

                {resendCooldown > 0 ? (
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    Resend OTP in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend Code
                  </button>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <span>{loading ? 'Verifying...' : 'Verify OTP & Continue'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Password Form */}
          {step === 3 && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  Set New Secure Password
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Email verified! Choose a personal password to use for future logins instead of your default roll number.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-4 pr-10 py-2.5 rounded-2xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-4 pr-10 py-2.5 rounded-2xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password checks */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      newPassword.length >= 6 ? 'text-emerald-600' : 'text-slate-300'
                    }`}
                  />
                  <span>At least 6 characters long</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      newPassword && newPassword !== student?.roll_number
                        ? 'text-emerald-600'
                        : 'text-slate-300'
                    }`}
                  />
                  <span>Different from your roll number</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      newPassword && confirmPassword && newPassword === confirmPassword
                        ? 'text-emerald-600'
                        : 'text-slate-300'
                    }`}
                  />
                  <span>Passwords match</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <span>{loading ? 'Saving & Finalizing...' : 'Complete Setup & Enter Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
