'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CalendarDays,
  Clock,
  MapPin,
  User,
  BookOpen,
  Download,
  Eye,
  FileText,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  year?: string;
  section?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function TimetableModal({ isOpen, onClose, year, section }: TimetableModalProps) {
  const [timetable, setTimetable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string>('Monday');
  const [showOriginalDoc, setShowOriginalDoc] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set initial day to today if Mon-Sat
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()];
      if (today !== 'Sunday') {
        setActiveDay(today);
      }
      fetchTimetable();
    }
  }, [isOpen]);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?_t=${Date.now()}`);
      const data = await res.json();
      if (res.ok && data.timetable) {
        setTimetable(data.timetable);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentSchedule = timetable?.schedule?.find((d: any) => d.day === activeDay);
  const periods = currentSchedule?.periods?.filter((p: any) => p.subject_name?.trim()) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between relative">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white/10 border border-white/20">
                <CalendarDays className="w-5 h-5 text-emerald-200" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                Official Department Schedule
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight">
              Class Timetable &bull; {timetable?.year || year || 'Student'} (Section {timetable?.section || section || 'A'})
            </h2>
            <p className="text-xs text-emerald-100">
              Department of Artificial Intelligence & Machine Learning (AIML) &bull; Semester {timetable?.semester || 'II-I'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {timetable?.image_url && (
              <button
                onClick={() => setShowOriginalDoc(!showOriginalDoc)}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all cursor-pointer border border-white/20"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showOriginalDoc ? 'Show Grid View' : 'View Official Circular'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold">Loading class schedule...</p>
            </div>
          ) : !timetable ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <CalendarDays className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">Timetable Not Published Yet</p>
              <p className="text-xs text-slate-400">
                The department HOD has not yet published the timetable for your section. Please check back soon.
              </p>
            </div>
          ) : showOriginalDoc && timetable.image_url ? (
            /* Original Document View */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Official Signed Department Circular
                </span>
                <a
                  href={timetable.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </a>
              </div>
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                {timetable.image_url.endsWith('.pdf') ? (
                  <iframe src={timetable.image_url} className="w-full h-[550px] rounded-xl" />
                ) : (
                  <img
                    src={timetable.image_url}
                    alt="Official Timetable Document"
                    className="max-h-[600px] w-auto object-contain rounded-xl shadow-xs"
                  />
                )}
              </div>
            </div>
          ) : (
            /* Interactive Grid View */
            <div className="space-y-4">
              {/* Day Pills Selector */}
              <div className="flex items-center overflow-x-auto gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
                {DAYS.map((day) => {
                  const count = timetable.schedule?.find((d: any) => d.day === day)?.periods?.filter((p: any) => p.subject_name?.trim()).length || 0;
                  const isActive = activeDay === day;

                  return (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{day}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Schedule periods for active day */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    {activeDay} Classes &bull; {periods.length} Periods Scheduled
                  </h3>
                  {timetable.image_url && (
                    <button
                      onClick={() => setShowOriginalDoc(true)}
                      className="sm:hidden text-xs font-bold text-emerald-700 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Circular</span>
                    </button>
                  )}
                </div>

                {periods.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No classes scheduled for {activeDay}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {periods.map((p: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          p.is_lab
                            ? 'bg-purple-50/60 border-purple-200'
                            : 'bg-white border-slate-200 shadow-2xs hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-900 text-white">
                            Period {p.period_number || idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {p.start_time} - {p.end_time}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <span>{p.subject_name}</span>
                            {p.is_lab && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                LAB
                              </span>
                            )}
                          </h4>
                          {p.subject_code && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              Code: {p.subject_code}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{p.faculty_name || 'Faculty assigned'}</span>
                          </span>
                          <span className="flex items-center gap-1 font-bold text-emerald-800">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{p.room_number || (p.is_lab ? 'Lab' : 'Classroom')}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
