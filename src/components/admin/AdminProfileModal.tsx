'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../ui/Toast';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id?: string;
    name?: string;
    email?: string;
    username?: string;
    role?: string;
  } | null;
  onUpdate: (updatedUser: any) => void;
}

export function AdminProfileModal({
  isOpen,
  onClose,
  user,
  onUpdate,
}: AdminProfileModalProps) {
  const { success, error } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  useEffect(() => {
    if (user) {
      setName(user.name || 'Dr. / Prof. (HOD)');
      setEmail(user.email || '');
      setUsername(user.username || 'admin');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword) {
      if (!currentPassword) {
        error('Please enter your current password to authorize password change.');
        return;
      }
      if (newPassword.length < 6) {
        error('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        error('New passwords do not match. Please verify.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          username: username.trim(),
          currentPassword: currentPassword ? currentPassword.trim() : undefined,
          newPassword: newPassword ? newPassword.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Failed to update HOD profile.');
        return;
      }

      success(data.message || 'HOD Profile updated successfully!');
      onUpdate(data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch {
      error('Network error occurred while saving profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-xs">
              <ShieldCheck className="w-6 h-6 text-blue-200" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight font-outfit">
                HOD Profile &amp; Security
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                DVR &amp; Dr. HS MIC College of Technology • AIML Department
              </p>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-4 bg-blue-900/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'profile'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Profile Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'security'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Password &amp; Secrets
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  HOD Full Name &amp; Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. K. Srinivas Rao (HOD)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  This title appears on official notices and the department header
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Official Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hod.aiml@mictech.edu.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Used for department administrative alerts and recovery
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Admin Login Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Username used when logging in on <span className="font-mono text-slate-600">aimlhodadmin.vercel.app</span>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200/80 rounded-2xl text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Private Department Credentials
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Only you (HOD Sir) will have access to these credentials. Keep your new password confidential.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Password (Required to authorize change)
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password (e.g. admin123)"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Secret Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Choose a strong private password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new private password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {newPassword && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        newPassword.length >= 6 ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <span>At least 6 characters</span>
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
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving Changes...' : 'Save HOD Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
