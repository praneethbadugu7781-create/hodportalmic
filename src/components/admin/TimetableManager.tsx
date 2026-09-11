'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarDays,
  Upload,
  Sparkles,
  Save,
  CheckCircle2,
  Trash2,
  Eye,
  Plus,
  Clock,
  BookOpen,
  User,
  MapPin,
  FileText,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const YEARS = ['2nd Year', '3rd Year', 'Final Year'] as const;
const SECTIONS = ['A', 'B'] as const;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const DEFAULT_PERIODS = [
  { period_number: 1, start_time: '09:15', end_time: '10:05' },
  { period_number: 2, start_time: '10:05', end_time: '10:55' },
  { period_number: 3, start_time: '11:05', end_time: '11:55' },
  { period_number: 4, start_time: '11:55', end_time: '12:45' },
  { period_number: 5, start_time: '13:35', end_time: '14:25' },
  { period_number: 6, start_time: '14:25', end_time: '15:15' },
  { period_number: 7, start_time: '15:15', end_time: '16:05' },
];

function createBlankSchedule() {
  return DAYS.map((day) => ({
    day,
    periods: DEFAULT_PERIODS.map((p) => ({
      period_number: p.period_number,
      start_time: p.start_time,
      end_time: p.end_time,
      subject_name: '',
      subject_code: '',
      faculty_name: '',
      room_number: '',
      is_lab: false,
    })),
  }));
}

export function TimetableManager() {
  const { success, error, info } = useToast();

  const [selectedYear, setSelectedYear] = useState<'2nd Year' | '3rd Year' | 'Final Year'>('2nd Year');
  const [selectedSection, setSelectedSection] = useState<'A' | 'B'>('A');
  const [semester, setSemester] = useState('II-I');

  const [schedule, setSchedule] = useState<any[]>(createBlankSchedule());
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string>('Monday');

  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingTimetableId, setExistingTimetableId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing timetable when Year or Section changes
  useEffect(() => {
    fetchTimetable();
  }, [selectedYear, selectedSection]);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?year=${encodeURIComponent(selectedYear)}&section=${selectedSection}&_t=${Date.now()}`);
      const data = await res.json();
      if (res.ok && data.timetable) {
        const tt = data.timetable;
        setExistingTimetableId(tt._id);
        setSemester(tt.semester || 'II-I');
        setImageUrl(tt.image_url || null);
        setLastUpdated(tt.updated_at ? new Date(tt.updated_at).toLocaleString() : null);

        if (Array.isArray(tt.schedule) && tt.schedule.length > 0) {
          // Merge with all 6 days in case any are missing
          const dayMap = new Map(tt.schedule.map((d: any) => [d.day, d.periods]));
          const full = DAYS.map((day) => ({
            day,
            periods: dayMap.get(day) || DEFAULT_PERIODS.map((p) => ({
              ...p,
              subject_name: '',
              subject_code: '',
              faculty_name: '',
              room_number: '',
              is_lab: false,
            })),
          }));
          setSchedule(full);
        } else {
          setSchedule(createBlankSchedule());
        }
      } else {
        setExistingTimetableId(null);
        setLastUpdated(null);
        setImageUrl(null);
        setSchedule(createBlankSchedule());
      }
    } catch {
      error('Failed to load timetable configuration');
    } finally {
      setLoading(false);
    }
  };

  // Handle Image Upload & AI Extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', selectedYear);
    formData.append('section', selectedSection);

    try {
      const res = await fetch('/api/timetable/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        error(data.error || 'Failed to process image');
        return;
      }

      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      }
      if (data.semester) {
        setSemester(data.semester);
      }
      if (Array.isArray(data.schedule) && data.schedule.length > 0) {
        setSchedule(data.schedule);
      }

      if (data.aiSuccess) {
        success('AI successfully extracted timetable! Review the periods below and click Publish.');
      } else {
        info('Timetable image uploaded. Period grid is ready for your review.');
      }
    } catch {
      error('An error occurred during file upload.');
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Update a single period cell
  const handlePeriodChange = (dayName: string, pIndex: number, field: string, value: any) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.day !== dayName) return d;
        const updatedPeriods = [...d.periods];
        updatedPeriods[pIndex] = {
          ...updatedPeriods[pIndex],
          [field]: value,
        };
        return { ...d, periods: updatedPeriods };
      })
    );
  };

  // Add an extra period to the current active day
  const handleAddPeriod = (dayName: string) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.day !== dayName) return d;
        const nextNum = d.periods.length + 1;
        return {
          ...d,
          periods: [
            ...d.periods,
            {
              period_number: nextNum,
              start_time: '16:05',
              end_time: '16:55',
              subject_name: '',
              subject_code: '',
              faculty_name: '',
              room_number: '',
              is_lab: false,
            },
          ],
        };
      })
    );
  };

  // Delete a period from the active day
  const handleDeletePeriod = (dayName: string, pIndex: number) => {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.day !== dayName) return d;
        const filtered = d.periods.filter((_: any, idx: number) => idx !== pIndex);
        return { ...d, periods: filtered };
      })
    );
  };

  // Save / Publish Timetable
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          section: selectedSection,
          semester,
          image_url: imageUrl,
          schedule,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Failed to save timetable');
        return;
      }

      success(`Timetable for ${selectedYear} Section ${selectedSection} published successfully!`);
      setExistingTimetableId(data.timetable._id);
      setLastUpdated(new Date().toLocaleString());
    } catch {
      error('Network error saving timetable');
    } finally {
      setSaving(false);
    }
  };

  // Delete published timetable
  const handleDeletePublished = async () => {
    if (!confirm(`Are you sure you want to reset the timetable for ${selectedYear} Section ${selectedSection}?`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?year=${encodeURIComponent(selectedYear)}&section=${selectedSection}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        success('Timetable reset successfully');
        setExistingTimetableId(null);
        setImageUrl(null);
        setLastUpdated(null);
        setSchedule(createBlankSchedule());
      } else {
        error('Failed to reset timetable');
      }
    } catch {
      error('Failed to delete timetable');
    } finally {
      setLoading(false);
    }
  };

  const currentDaySchedule = schedule.find((d) => d.day === activeDay) || { day: activeDay, periods: [] };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <CalendarDays className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Academic Operations
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Class Timetable Manager
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Upload official timetable circulars or let AI extract periods directly into the student portal schedule.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{extracting ? 'AI Extracting...' : 'Upload Image & AI Extract'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Publishing...' : 'Publish Timetable'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls: Year, Section, Semester */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              {YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedYear === y
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>

            {/* Section Selector: Only Section A & B */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              {SECTIONS.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSection(sec)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSection === sec
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Section {sec}
                </button>
              ))}
            </div>

            {/* Semester Input */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold">Semester:</span>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. II-I"
                className="w-16 bg-white px-2 py-0.5 rounded-lg border border-slate-200 font-bold text-slate-800 text-center uppercase"
              />
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-3 text-xs">
            {existingTimetableId ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live for Students
                </span>
                {lastUpdated && (
                  <span className="text-slate-400 text-[11px]">Updated {lastUpdated}</span>
                )}
                <button
                  onClick={handleDeletePublished}
                  className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                  title="Reset Timetable"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-amber-700 bg-amber-50 px-3 py-1 rounded-full font-bold border border-amber-200">
                Not Published Yet
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Uploaded Official Document Banner (if image uploaded) */}
      {imageUrl && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 overflow-hidden shrink-0 flex items-center justify-center">
              {imageUrl.endsWith('.pdf') ? (
                <FileText className="w-6 h-6 text-blue-600" />
              ) : (
                <img src={imageUrl} alt="Timetable Document" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Official Department Timetable Circular Attached
              </h4>
              <p className="text-[11px] text-slate-500">
                Students can view and download this exact official image in their portal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImageModal(true)}
              className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setImageUrl(null)}
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg cursor-pointer"
              title="Remove document attachment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Day Tabs Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center overflow-x-auto border-b border-slate-200 bg-slate-50/60 p-2 gap-1.5">
          {DAYS.map((day) => {
            const dayPeriods = schedule.find((d) => d.day === day)?.periods || [];
            const filledCount = dayPeriods.filter((p: any) => p.subject_name?.trim()).length;
            const isActive = activeDay === day;

            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                <span>{day}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : filledCount > 0
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {filledCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Schedule Period Cards for Active Day */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-base font-black text-slate-900">
                {activeDay} Schedule &bull; {selectedYear} (Section {selectedSection})
              </h3>
              <p className="text-xs text-slate-500">
                Set period times, subjects, faculty names, and lab indicators.
              </p>
            </div>
            <button
              onClick={() => handleAddPeriod(activeDay)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Period</span>
            </button>
          </div>

          {currentDaySchedule.periods.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No periods added for {activeDay}. Click &quot;Add Period&quot; above to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {currentDaySchedule.periods.map((period: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center gap-3 ${
                    period.is_lab
                      ? 'bg-purple-50/50 border-purple-200/80'
                      : period.subject_name
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50/50 border-dashed border-slate-300'
                  }`}
                >
                  {/* Period Number & Time Range */}
                  <div className="flex items-center gap-2 shrink-0 md:w-56">
                    <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                      {period.period_number || idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={period.start_time || ''}
                        onChange={(e) => handlePeriodChange(activeDay, idx, 'start_time', e.target.value)}
                        className="text-xs font-semibold bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-700"
                      />
                      <span className="text-slate-400 text-xs">&rarr;</span>
                      <input
                        type="time"
                        value={period.end_time || ''}
                        onChange={(e) => handlePeriodChange(activeDay, idx, 'end_time', e.target.value)}
                        className="text-xs font-semibold bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Subject Name */}
                  <div className="flex-1 min-w-[180px]">
                    <div className="relative">
                      <input
                        type="text"
                        value={period.subject_name || ''}
                        onChange={(e) => handlePeriodChange(activeDay, idx, 'subject_name', e.target.value)}
                        placeholder="Subject Name (e.g. Machine Learning)"
                        className="w-full pl-8 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Faculty Name */}
                  <div className="flex-1 min-w-[150px]">
                    <div className="relative">
                      <input
                        type="text"
                        value={period.faculty_name || ''}
                        onChange={(e) => handlePeriodChange(activeDay, idx, 'faculty_name', e.target.value)}
                        placeholder="Faculty (e.g. Dr. K. Srinivas)"
                        className="w-full pl-8 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Room / Lab */}
                  <div className="w-36">
                    <div className="relative">
                      <input
                        type="text"
                        value={period.room_number || ''}
                        onChange={(e) => handlePeriodChange(activeDay, idx, 'room_number', e.target.value)}
                        placeholder="Room / Lab 3"
                        className="w-full pl-8 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Lab Checkbox & Delete */}
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={period.is_lab || false}
                        onChange={(e) => handlePeriodChange(activeDay, idx, 'is_lab', e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                      />
                      <span>Lab</span>
                    </label>

                    <button
                      onClick={() => handleDeletePeriod(activeDay, idx)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded-lg cursor-pointer transition-colors"
                      title="Remove Period"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {showImageModal && imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white max-w-4xl w-full rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Official Department Timetable Circular &bull; {selectedYear} Section {selectedSection}
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold px-3 py-1 rounded-xl bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-2xl bg-slate-50 p-2 flex items-center justify-center">
              {imageUrl.endsWith('.pdf') ? (
                <iframe src={imageUrl} className="w-full h-[600px] rounded-xl border border-slate-200" />
              ) : (
                <img src={imageUrl} alt="Timetable Document" className="max-h-[70vh] object-contain rounded-xl" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
