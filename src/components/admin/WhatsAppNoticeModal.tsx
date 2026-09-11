'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  Users,
  Clock,
  Send,
  X,
  Sparkles,
  FileText,
  AlertTriangle,
  Layers,
  CheckSquare,
} from 'lucide-react';
import { Task } from '@/lib/types';
import { formatDate, copyToClipboard } from '@/lib/utils';
import { useToast } from '../ui/Toast';

interface WhatsAppNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  notCompletedStudents: any[];
}

export type NoticeTemplateType = 'CLEAN' | 'COMPACT' | 'URGENT' | 'ROLLS_ONLY';

export function WhatsAppNoticeModal({
  isOpen,
  onClose,
  task,
  notCompletedStudents,
}: WhatsAppNoticeModalProps) {
  const { success, error, info } = useToast();

  const [activeSectionTab, setActiveSectionTab] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [templateStyle, setTemplateStyle] = useState<NoticeTemplateType>('CLEAN');
  const [includeRolls, setIncludeRolls] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const [copied, setCopied] = useState(false);

  // Filter students based on active section tab
  const getFilteredStudents = (tab: 'ALL' | 'A' | 'B') => {
    if (tab === 'ALL') return notCompletedStudents;
    return notCompletedStudents.filter((s) => s.section === tab);
  };

  const currentFilteredStudents = getFilteredStudents(activeSectionTab);
  const countA = getFilteredStudents('A').length;
  const countB = getFilteredStudents('B').length;

  const buildNotice = (
    currentTask: Task | null,
    students: any[],
    sectionTab: 'ALL' | 'A' | 'B',
    template: NoticeTemplateType,
    withRolls: boolean
  ) => {
    if (!currentTask) return '';
    const rolls = students.map((s) => s.roll_number).sort();
    const deadlineStr = formatDate(currentTask.deadline);
    const sectionLabel = sectionTab === 'ALL' ? 'Sections A & B' : `Section ${sectionTab}`;
    const yearLabel = currentTask.target_year || 'AIML Department';

    // Helper to format rolls compactly
    const formatCompactRolls = () => {
      if (sectionTab === 'ALL') {
        const secARolls = students.filter((s) => s.section === 'A').map((s) => s.roll_number).sort();
        const secBRolls = students.filter((s) => s.section === 'B').map((s) => s.roll_number).sort();
        let out = '';
        if (secARolls.length > 0) {
          out += `📌 *Section A (${secARolls.length} pending):*\n${secARolls.join(', ')}\n\n`;
        }
        if (secBRolls.length > 0) {
          out += `📌 *Section B (${secBRolls.length} pending):*\n${secBRolls.join(', ')}`;
        }
        return out.trim();
      }
      return `📌 *Pending Rolls (${rolls.length}):*\n${rolls.join(', ')}`;
    };

    if (template === 'ROLLS_ONLY') {
      return `📌 *${currentTask.title.toUpperCase()} — PENDING ROLL NUMBERS*\n👥 *Class:* ${yearLabel} (${sectionLabel})\n⚠️ *Total Pending:* ${rolls.length} students\n\n${formatCompactRolls()}`;
    }

    if (template === 'URGENT') {
      let msg = `⚠️ *URGENT COMPLIANCE NOTICE — AIML DEPT*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 *Task:* ${currentTask.title}\n⏰ *Deadline:* ${deadlineStr}\n👥 *Target:* ${yearLabel} • ${sectionLabel}\n⚠️ *Pending Count:* ${rolls.length} students\n\nAll pending students are hereby instructed to submit their required proof/response immediately on the student portal before the deadline.\n\n👉 *Submit Here:* https://hodportalmic.vercel.app/student`;

      if (withRolls && rolls.length > 0) {
        msg += `\n\n${formatCompactRolls()}`;
      }

      msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_— HOD Office, Department of AIML_`;
      return msg;
    }

    if (template === 'COMPACT') {
      return `📢 *DEPARTMENT OF ARTIFICIAL INTELLIGENCE & MACHINE LEARNING*\n*DVR & Dr. HS MIC College of Technology*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 *NOTICE: PENDING TASK SUBMISSION*\n\n*Task Title:* ${currentTask.title}\n*Deadline:* ${deadlineStr}\n*Target Class:* ${yearLabel} (${sectionLabel})\n⚠️ *Pending Submissions:* ${rolls.length} students\n\n${formatCompactRolls()}\n\nPlease login and submit your proof immediately on the portal:\n🔗 *Portal Link:* https://hodportalmic.vercel.app/student\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_— Head of Department (AIML)_`;
    }

    // Default: CLEAN Template (Zero clutter, perfect for WhatsApp)
    let msg = `📢 *DEPARTMENT OF ARTIFICIAL INTELLIGENCE & MACHINE LEARNING*\n*DVR & Dr. HS MIC College of Technology (Autonomous)*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 *NOTICE: PENDING TASK SUBMISSION*\n\n*Task Title:* ${currentTask.title}\n*Deadline:* ${deadlineStr}\n*Target Class:* ${yearLabel} (${sectionLabel})\n⚠️ *Pending Submissions:* ${rolls.length} students\n\nStudents who have not yet submitted their required proof/response are hereby directed to submit immediately before the deadline.`;

    if (withRolls && rolls.length > 0) {
      msg += `\n\n${formatCompactRolls()}`;
    }

    msg += `\n\n🔗 *Submit on Portal:* https://hodportalmic.vercel.app/student\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_— Head of Department (AIML)_`;
    return msg;
  };

  useEffect(() => {
    if (isOpen && task) {
      const msg = buildNotice(task, currentFilteredStudents, activeSectionTab, templateStyle, includeRolls);
      setNoticeText(msg);
      setCopied(false);
    }
  }, [isOpen, task, activeSectionTab, templateStyle, includeRolls]);

  if (!isOpen || !task) return null;

  const handleCopy = async () => {
    const ok = await copyToClipboard(noticeText);
    if (ok) {
      setCopied(true);
      success('Notice copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } else {
      error('Failed to copy notice');
    }
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(noticeText);
    if (encoded.length > 4000) {
      info('Notice is very long. Copying to clipboard and opening WhatsApp...');
      copyToClipboard(noticeText);
      const shortEncoded = encodeURIComponent(
        `📢 *DEPARTMENT NOTICE: ${task.title}*\n⏰ Deadline: ${formatDate(task.deadline)}\n⚠️ Pending: ${currentFilteredStudents.length} students\n👉 Submit proof here: https://hodportalmic.vercel.app/student\n(Full list copied to your clipboard)`
      );
      window.open(`https://api.whatsapp.com/send?text=${shortEncoded}`, '_blank');
      return;
    }
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
    success('Opening WhatsApp with clean notice...');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full my-auto flex flex-col shadow-2xl border border-slate-200 overflow-hidden max-h-[94vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50/60 via-slate-50/80 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#25D366]/15 text-[#128C7E] flex items-center justify-center shrink-0 border border-[#25D366]/30 shadow-xs">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base font-display truncate">
                  WhatsApp Notice Broadcast
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                  Clean Format
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                Task: <span className="font-bold text-slate-800">{task.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          {/* Step 1: Section Segmentation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                1. Target Section:
              </label>
              <span className="text-[11px] text-slate-400 font-semibold">
                {currentFilteredStudents.length} Pending
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveSectionTab('ALL')}
                className={`py-2 px-2 sm:px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  activeSectionTab === 'ALL'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="truncate">Both (A &amp; B)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold shrink-0 ${activeSectionTab === 'ALL' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {notCompletedStudents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSectionTab('A')}
                className={`py-2 px-2 sm:px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  activeSectionTab === 'A'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>Sec A</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold shrink-0 ${activeSectionTab === 'A' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {countA}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSectionTab('B')}
                className={`py-2 px-2 sm:px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  activeSectionTab === 'B'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>Sec B</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold shrink-0 ${activeSectionTab === 'B' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {countB}
                </span>
              </button>
            </div>
          </div>

          {/* Step 2: Notice Style */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                2. Notice Template:
              </label>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRolls}
                  onChange={(e) => setIncludeRolls(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span>Attach Roll Numbers</span>
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              {[
                { id: 'CLEAN', label: 'Clean Notice (No Rolls)', icon: FileText, desc: 'Short & professional' },
                { id: 'COMPACT', label: 'Summary + Rolls', icon: Layers, desc: 'Includes roll list' },
                { id: 'URGENT', label: 'Urgent Warning', icon: AlertTriangle, desc: 'High priority alert' },
                { id: 'ROLLS_ONLY', label: 'Rolls Only', icon: Sparkles, desc: 'Raw roll list' },
              ].map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = templateStyle === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setTemplateStyle(tpl.id as any);
                      if (tpl.id === 'COMPACT') setIncludeRolls(true);
                      if (tpl.id === 'CLEAN') setIncludeRolls(false);
                    }}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tpl.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notice Live Editor & Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                3. Message Preview &amp; Edit:
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold">
                {noticeText.length} characters • Ready to send
              </span>
            </div>
            <textarea
              rows={8}
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              className="w-full p-3 sm:p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-inner"
              placeholder="Edit notice text before sending..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-5 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors text-center cursor-pointer order-2 sm:order-1"
          >
            Close
          </button>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'Copied!' : 'Copy Notice'}</span>
            </button>

            {/* Direct WhatsApp Share Button */}
            <button
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#25D366]/25 transition-all hover:scale-[1.02] cursor-pointer"
              title="Open WhatsApp with clean message"
            >
              <Send className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
