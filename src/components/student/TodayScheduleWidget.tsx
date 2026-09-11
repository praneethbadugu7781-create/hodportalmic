'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  User,
  BookOpen,
  ChevronRight,
  Sparkles,
  Coffee,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface TodayScheduleWidgetProps {
  onOpenFullTimetable: () => void;
  year?: string;
  section?: string;
}

export function TodayScheduleWidget({ onOpenFullTimetable, year, section }: TodayScheduleWidgetProps) {
  const [timetable, setTimetable] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Update clock every minute for real-time period detection
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      const res = await fetch('/api/timetable');
      const data = await res.json();
      if (res.ok && data.timetable) {
        setTimetable(data.timetable);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-1/4 mb-3"></div>
        <div className="h-16 bg-slate-100 rounded-2xl w-full"></div>
      </div>
    );
  }

  // If no timetable published yet
  if (!timetable || !Array.isArray(timetable.schedule)) {
    return null;
  }

  // Determine current day name (e.g. 'Monday', 'Friday', 'Sunday')
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysOfWeek[now.getDay()];
  const isSunday = todayName === 'Sunday';

  const todaySchedule = timetable.schedule.find((d: any) => d.day === todayName);
  const todayPeriods = todaySchedule?.periods?.filter((p: any) => p.subject_name?.trim()) || [];

  // Current time in "HH:MM" 24h format for comparison
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  // Find active ongoing period
  let activePeriod: any = null;
  let nextPeriod: any = null;

  for (let i = 0; i < todayPeriods.length; i++) {
    const p = todayPeriods[i];
    if (p.start_time <= currentTimeStr && currentTimeStr <= p.end_time) {
      activePeriod = p;
      nextPeriod = todayPeriods[i + 1] || null;
      break;
    } else if (currentTimeStr < p.start_time) {
      if (!nextPeriod) nextPeriod = p;
    }
  }

  return (
    <div className="bg-gradient-to-r from-white via-emerald-50/20 to-teal-50/20 rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-xs relative overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-100/60">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
            <CalendarDays className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Today&apos;s Class Schedule
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                {todayName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {timetable.year} &bull; Section {timetable.section} &bull; {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFullTimetable}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
        >
          <span>Full Weekly Timetable</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body: Ongoing Class + Schedule Preview */}
      <div className="pt-4">
        {isSunday ? (
          <div className="text-center py-6 text-slate-500 space-y-1">
            <p className="text-xs font-bold text-slate-700">No classes scheduled on Sunday 🌴</p>
            <p className="text-[11px] text-slate-400">Enjoy your weekend and prepare for the upcoming week.</p>
          </div>
        ) : todayPeriods.length === 0 ? (
          <div className="text-center py-6 text-slate-500 space-y-1">
            <p className="text-xs font-bold text-slate-700">No classes scheduled for {todayName}.</p>
            <p className="text-[11px] text-slate-400">Click &quot;Full Weekly Timetable&quot; to check the rest of your week.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Box 1: Live Now / Next Up */}
            <div className={`p-4 rounded-2xl border transition-all ${
              activePeriod
                ? 'bg-emerald-500/10 border-emerald-300 shadow-xs'
                : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  {activePeriod ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-emerald-700">Live Period Now</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-500">Next Upcoming Class</span>
                    </>
                  )}
                </span>
                <span className="text-[11px] font-bold text-slate-500 font-mono">
                  {activePeriod ? `${activePeriod.start_time} - ${activePeriod.end_time}` : nextPeriod ? `${nextPeriod.start_time} - ${nextPeriod.end_time}` : 'Completed for today'}
                </span>
              </div>

              {activePeriod ? (
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{activePeriod.subject_name}</span>
                    {activePeriod.is_lab && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                        LAB
                      </span>
                    )}
                  </h4>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    {activePeriod.faculty_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activePeriod.faculty_name}</span>
                      </span>
                    )}
                    {activePeriod.room_number && (
                      <span className="flex items-center gap-1 font-semibold text-emerald-800">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{activePeriod.room_number}</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : nextPeriod ? (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{nextPeriod.subject_name}</span>
                    {nextPeriod.is_lab && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                        LAB
                      </span>
                    )}
                  </h4>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                    {nextPeriod.faculty_name && <span>Faculty: {nextPeriod.faculty_name}</span>}
                    {nextPeriod.room_number && <span className="font-medium text-slate-700">{nextPeriod.room_number}</span>}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-1 font-medium">
                  All scheduled classes for today are complete! 🎉
                </p>
              )}
            </div>

            {/* Box 2: Horizontal Scroll of Today's Periods */}
            <div className="flex items-center gap-2 overflow-x-auto p-1">
              {todayPeriods.map((p: any, idx: number) => {
                const isCurrent = activePeriod?.period_number === p.period_number;
                const isPast = p.end_time < currentTimeStr;

                return (
                  <div
                    key={idx}
                    className={`min-w-[130px] p-3 rounded-2xl border text-xs flex flex-col justify-between shrink-0 transition-all ${
                      isCurrent
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102'
                        : isPast
                        ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                        : 'bg-white text-slate-800 border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span>P{p.period_number || idx + 1}</span>
                        <span className={isCurrent ? 'text-emerald-100' : 'text-slate-400'}>
                          {p.start_time}
                        </span>
                      </div>
                      <p className="font-extrabold truncate text-xs" title={p.subject_name}>
                        {p.subject_name}
                      </p>
                    </div>
                    <div className="mt-2 text-[10px] truncate opacity-90">
                      {p.room_number || (p.is_lab ? 'Lab' : 'Class')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
