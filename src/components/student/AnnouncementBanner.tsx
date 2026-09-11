'use client';

import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Clock,
  Pin,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  priority: 'INFO' | 'IMPORTANT' | 'URGENT';
  target_year?: string;
  target_section?: string;
  posted_by?: string;
  created_at: string;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`/api/announcements?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.announcements)) {
        setAnnouncements(data.announcements);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('hod_dismissed_announcements');
      if (stored) {
        setDismissedIds(JSON.parse(stored));
      }
    } catch {}

    fetchAnnouncements();

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchAnnouncements();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, []);

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.includes(a.id));

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  const currentAnnouncement = visibleAnnouncements[currentIndex] || visibleAnnouncements[0];

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('hod_dismissed_announcements', JSON.stringify(updated));
    } catch {}
    if (currentIndex >= visibleAnnouncements.length - 1) {
      setCurrentIndex(Math.max(0, visibleAnnouncements.length - 2));
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % visibleAnnouncements.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + visibleAnnouncements.length) % visibleAnnouncements.length);
  };

  const isUrgent = currentAnnouncement.priority === 'URGENT';
  const isImportant = currentAnnouncement.priority === 'IMPORTANT';

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-md relative overflow-hidden animate-in fade-in duration-200 ${
        isUrgent
          ? 'bg-gradient-to-r from-rose-50 via-rose-50/80 to-white border-rose-300 shadow-rose-500/10'
          : isImportant
          ? 'bg-gradient-to-r from-amber-50 via-amber-50/80 to-white border-amber-300 shadow-amber-500/10'
          : 'bg-gradient-to-r from-blue-50 via-indigo-50/60 to-white border-blue-200 shadow-blue-500/10'
      }`}
    >
      {/* Decorative colored top line */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          isUrgent ? 'bg-rose-600' : isImportant ? 'bg-amber-500' : 'bg-blue-600'
        }`}
      />

      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isUrgent
                ? 'bg-rose-600 text-white animate-pulse'
                : isImportant
                ? 'bg-amber-500 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isImportant ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Megaphone className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isUrgent
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : isImportant
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                {isUrgent ? 'URGENT NOTICE' : isImportant ? 'IMPORTANT CIRCULAR' : 'DEPARTMENT NOTICE'}
              </span>

              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formatDate(currentAnnouncement.created_at)}</span>
              </span>

              {currentAnnouncement.posted_by && (
                <span className="text-[11px] text-slate-500 hidden md:inline font-medium">
                  • By {currentAnnouncement.posted_by}
                </span>
              )}
            </div>

            <h3 className="font-black text-slate-900 text-sm sm:text-base leading-snug">
              {currentAnnouncement.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-line pt-0.5">
              {currentAnnouncement.content}
            </p>
          </div>
        </div>

        {/* Right Controls: Dismiss & Carousel */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {visibleAnnouncements.length > 1 && (
            <div className="flex items-center gap-0.5 mr-1">
              <button
                onClick={handlePrev}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Previous Notice"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold text-slate-500 px-1">
                {currentIndex + 1}/{visibleAnnouncements.length}
              </span>
              <button
                onClick={handleNext}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="Next Notice"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => handleDismiss(currentAnnouncement.id)}
            className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-300 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
