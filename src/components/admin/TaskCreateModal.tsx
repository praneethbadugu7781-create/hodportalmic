'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  FileText,
  Link as LinkIcon,
  CheckCircle,
  Users,
  Calendar,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { TaskType, TaskPriority, TargetType, AcademicYear, Section, TargetSection } from '@/lib/types';
import { formatDate, formatForDateTimeLocal, parseTaskDeadline } from '@/lib/utils';
import { useToast } from '../ui/Toast';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export function TaskCreateModal({ isOpen, onClose, onTaskCreated }: TaskCreateModalProps) {
  const { success, error } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [type, setType] = useState<TaskType>('YES_NO');
  const [externalLink, setExternalLink] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [required, setRequired] = useState(true);
  const [targetType, setTargetType] = useState<TargetType>('ALL');
  const [targetYear, setTargetYear] = useState<AcademicYear>('3rd Year');
  const [targetSection, setTargetSection] = useState<TargetSection | Section>('BOTH');

  // Preview Student Count
  const [estimatedStudentCount, setEstimatedStudentCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      calculateTargetCount();
      // Set default deadline to 7 days from today at 23:59 IST
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(23, 59, 0, 0);
      setDeadline(formatForDateTimeLocal(d));
    }
  }, [isOpen, targetType, targetYear, targetSection]);

  const calculateTargetCount = async () => {
    try {
      const isBoth = targetSection === 'BOTH';
      const query = new URLSearchParams({
        status: 'ACTIVE',
        limit: '1000',
        year: targetType === 'YEAR' || targetType === 'YEAR_SECTION' ? targetYear : 'all',
        section: (targetType === 'SECTION' || targetType === 'YEAR_SECTION')
          ? (isBoth ? 'all' : targetSection)
          : 'all',
      });
      const res = await fetch(`/api/students?${query}`);
      const data = await res.json();
      if (res.ok) {
        setEstimatedStudentCount(data.pagination?.total || 0);
      }
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!title.trim() || !description.trim()) {
        error('Please enter task title and description.');
        return;
      }
    }
    if (step === 2) {
      if (type === 'LINK_CONFIRMATION' && !externalLink.trim()) {
        error('Please provide an external link for Link Confirmation task.');
        return;
      }
    }
    if (step === 4) {
      if (!deadline) {
        error('Please select a valid deadline.');
        return;
      }
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const handlePublish = async () => {
    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        instructions,
        type,
        external_link: type === 'LINK_CONFIRMATION' ? externalLink : null,
        deadline: parseTaskDeadline(deadline).toISOString(),
        priority,
        required: required ? 1 : 0,
        target_type: targetType,
        target_year: targetType === 'YEAR' || targetType === 'YEAR_SECTION' ? targetYear : null,
        target_section: targetType === 'SECTION' || targetType === 'YEAR_SECTION' ? targetSection : null,
        status: 'ACTIVE',
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        success(`Task created and assigned to ${data.assignedCount} students!`);
        onTaskCreated();
        onClose();
        resetForm();
      } else {
        error(data.error || 'Failed to publish task');
      }
    } catch {
      error('An error occurred while creating task');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setTitle('');
    setDescription('');
    setInstructions('');
    setType('YES_NO');
    setExternalLink('');
    setPriority('MEDIUM');
    setRequired(true);
    setTargetType('ALL');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header & Step Indicator */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Create New Department Task</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-sm">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Steps */}
          <div className="flex items-center justify-between mt-4">
            {[
              { num: 1, label: 'Details' },
              { num: 2, label: 'Task Type' },
              { num: 3, label: 'Targeting' },
              { num: 4, label: 'Deadline' },
              { num: 5, label: 'Review & Publish' },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-1.5 text-xs font-semibold">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    step === s.num
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : step > s.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={`hidden sm:inline ${step === s.num ? 'text-blue-600' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm">
          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Smart India Hackathon Registration Confirmation"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Purpose *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this task is required and what students need to do..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specific Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Step-by-step instructions or prerequisites..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={required}
                      onChange={(e) => setRequired(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-700">Mandatory / Required Activity</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Task Type */}
          {step === 2 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Choose Response / Completion Type:
              </label>

              <div className="grid grid-cols-1 gap-3">
                {/* Type A */}
                <div
                  onClick={() => setType('YES_NO')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    type === 'YES_NO'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                        YES / NO
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          Type A — Yes / No Confirmation
                        </div>
                        <div className="text-xs text-slate-500">
                          Student simply answers [YES, I COMPLETED IT] or [NO].
                        </div>
                      </div>
                    </div>
                    {type === 'YES_NO' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                  </div>
                </div>

                {/* Type B */}
                <div
                  onClick={() => setType('FILE_SUBMISSION')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    type === 'FILE_SUBMISSION'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs">
                        FILE
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          Type B — File Submission / Proof Upload
                        </div>
                        <div className="text-xs text-slate-500">
                          Student uploads proof file (PDF, PNG, JPG, DOCX).
                        </div>
                      </div>
                    </div>
                    {type === 'FILE_SUBMISSION' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                  </div>
                </div>

                {/* Type C */}
                <div
                  onClick={() => setType('LINK_CONFIRMATION')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    type === 'LINK_CONFIRMATION'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs">
                        LINK
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          Type C — External Link + Confirmation
                        </div>
                        <div className="text-xs text-slate-500">
                          Student visits provided URL then confirms completion.
                        </div>
                      </div>
                    </div>
                    {type === 'LINK_CONFIRMATION' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                  </div>
                </div>
              </div>

              {type === 'LINK_CONFIRMATION' && (
                <div className="pt-2 animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    External Link / Survey URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    placeholder="https://forms.gle/sample-department-survey"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Targeting */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Target Audience:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  {[
                    { id: 'ALL', label: 'Entire Department' },
                    { id: 'YEAR', label: 'Specific Academic Year' },
                    { id: 'SECTION', label: 'Specific Section' },
                    { id: 'YEAR_SECTION', label: 'Year + Section' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetType(t.id as TargetType)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        targetType === t.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {(targetType === 'YEAR' || targetType === 'YEAR_SECTION') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Target Year
                  </label>
                  <select
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value as AcademicYear)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="Final Year">Final Year</option>
                  </select>
                </div>
              )}

              {(targetType === 'SECTION' || targetType === 'YEAR_SECTION') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Target Section
                  </label>
                  <select
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="BOTH">Both (Section A &amp; B)</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                  </select>
                </div>
              )}

              {/* Real-time calculated count */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs font-bold text-blue-900">Target Calculation</div>
                    <div className="text-xs text-blue-700">
                      Task will be assigned to{' '}
                      <span className="font-extrabold text-blue-900">{estimatedStudentCount} students</span>
                    </div>
                  </div>
                </div>
                <span className="text-xl font-black text-blue-700">{estimatedStudentCount}</span>
              </div>
            </div>
          )}

          {/* STEP 4: Deadline */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Submission Deadline (Date & Time) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                />
                <div className="mt-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/70 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-blue-800 flex items-center gap-1.5">
                    <span>🇮🇳</span> Indian Standard Time (IST)
                  </span>
                  <span className="font-black text-slate-900">
                    {deadline ? formatDate(parseTaskDeadline(deadline)) : 'Select timing'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">📌 Automatic Overdue Management:</p>
                <p>
                  Once the specified deadline passes, any student who has not submitted will be automatically marked as <strong>OVERDUE</strong> on their dashboard and the administrative reports.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Publish */}
          {step === 5 && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Title</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {priority} Priority
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900">{title}</div>
                <div className="text-xs text-slate-600">{description}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-0.5">TYPE</span>
                  <span className="font-bold text-slate-800">{type.replace('_', ' ')}</span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-bold block mb-0.5">DEADLINE (IST)</span>
                  <span className="font-bold text-blue-900">
                    {deadline ? formatDate(parseTaskDeadline(deadline)) : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs">Ready to Publish</div>
                  <div className="text-xs text-emerald-700">
                    Immediately assigns to {estimatedStudentCount} matching students.
                  </div>
                </div>
                <span className="text-2xl font-black text-emerald-700">{estimatedStudentCount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-30 hover:bg-slate-200 rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                disabled={submitting}
                className="flex items-center gap-1.5 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                <span>{submitting ? 'Publishing...' : 'Confirm & Publish Task'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
