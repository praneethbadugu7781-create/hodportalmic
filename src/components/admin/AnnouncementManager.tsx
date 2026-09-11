'use client';

import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  PlusCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Eye,
  Filter,
  Users,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '../ui/Toast';

export interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  priority: 'INFO' | 'IMPORTANT' | 'URGENT';
  target_year: string;
  target_section: string;
  is_active: boolean;
  posted_by: string;
  created_at: string;
}

export function AnnouncementManager() {
  const { success, error, info } = useToast();
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'INFO' | 'IMPORTANT' | 'URGENT'>('INFO');
  const [targetYear, setTargetYear] = useState('all');
  const [targetSection, setTargetSection] = useState('all');

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/announcements?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.announcements)) {
        setAnnouncements(data.announcements);
      }
    } catch {
      error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      error('Please provide both title and announcement details');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          priority,
          target_year: targetYear,
          target_section: targetSection,
          posted_by: 'Dr. Head of Department, AIML',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success('Announcement published to student dashboards!');
        setShowCreateModal(false);
        setTitle('');
        setContent('');
        setPriority('INFO');
        setTargetYear('all');
        setTargetSection('all');
        fetchAnnouncements();
      } else {
        error(data.error || 'Failed to publish announcement');
      }
    } catch {
      error('Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: AnnouncementData) => {
    try {
      const res = await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          is_active: !item.is_active,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        success(`Announcement marked as ${!item.is_active ? 'Active' : 'Inactive'}`);
        fetchAnnouncements();
      } else {
        error(data.error || 'Failed to update status');
      }
    } catch {
      error('Failed to update status');
    }
  };

  const handleDeleteAnnouncement = async (id: string, noticeTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete the announcement "${noticeTitle}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/announcements?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        success('Announcement deleted');
        fetchAnnouncements();
      } else {
        error(data.error || 'Failed to delete');
      }
    } catch {
      error('Failed to delete announcement');
    }
  };

  const activeCount = announcements.filter((a) => a.is_active).length;
  const urgentCount = announcements.filter((a) => a.priority === 'URGENT' && a.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
              Official Communication
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Live broadcast to student portal
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
            Department Noticeboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Publish urgent circulars, exam notifications, and activity instructions directly to students.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post Announcement</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Notices</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{announcements.length}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Megaphone className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active Broadcasts</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Urgent Alerts</span>
            <div className="text-2xl font-black text-rose-700 mt-1">{urgentCount}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider px-1">
          Published Notices ({announcements.length})
        </h3>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">No Department Notices Posted</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click &quot;Post Announcement&quot; to broadcast urgent exam notices, project deadlines, or activity alerts to student dashboards.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => {
              const isUrgent = item.priority === 'URGENT';
              const isImportant = item.priority === 'IMPORTANT';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    !item.is_active
                      ? 'border-slate-200 opacity-60 bg-slate-50/50'
                      : isUrgent
                      ? 'border-rose-200 bg-gradient-to-r from-rose-50/30 to-white'
                      : isImportant
                      ? 'border-amber-200 bg-gradient-to-r from-amber-50/30 to-white'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                          isUrgent
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isImportant
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {item.priority}
                      </span>

                      <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                        {item.target_year === 'all' ? 'All Years' : item.target_year}
                        {item.target_section !== 'all' ? ` (Sec ${item.target_section})` : ' (All Secs)'}
                      </span>

                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(item.created_at)}</span>
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Archived'}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                      {item.title}
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>

                    <p className="text-[11px] text-slate-400">
                      Author: <span className="font-semibold text-slate-600">{item.posted_by}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                        item.is_active
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {item.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      onClick={() => handleDeleteAnnouncement(item.id, item.title)}
                      className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200/80"
                      title="Delete notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Post Department Announcement
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notice Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Mandatory Project Review or AICTE Certificate Upload"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-800"
                  >
                    <option value="INFO">Info (Blue)</option>
                    <option value="IMPORTANT">Important (Amber)</option>
                    <option value="URGENT">Urgent Alert (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Year</label>
                  <select
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800"
                  >
                    <option value="all">All Years</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="Final Year">Final Year</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Section</label>
                  <select
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value)}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800"
                  >
                    <option value="all">Both (A &amp; B)</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Announcement Details &amp; Instructions *
                </label>
                <textarea
                  rows={4}
                  placeholder="Write instructions, deadlines, venue, or required student action..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish to Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
