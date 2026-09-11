'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  Users,
  Clock,
  Send,
  X,
  Sparkles,
  FileText,
  AlertTriangle,
  Layers,
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

export function WhatsAppNoticeModal({
  isOpen,
  onClose,
  task,
  notCompletedStudents,
}: WhatsAppNoticeModalProps) {
  const { success, error } = useToast();

  const [activeSectionTab, setActiveSectionTab] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [templateStyle, setTemplateStyle] = useState<'FORMAL' | 'URGENT' | 'ROLLS_ONLY'>('FORMAL');
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
    template: 'FORMAL' | 'URGENT' | 'ROLLS_ONLY'
  ) => {
    if (!currentTask) return '';
    const rolls = students.map((s) => s.roll_number).sort();
    const deadlineStr = formatDate(currentTask.deadline);
    const sectionLabel = sectionTab === 'ALL' ? 'Section A & B' : `Section ${sectionTab}`;
    const yearLabel = currentTask.target_year || 'AIML Department';

    if (template === 'ROLLS_ONLY') {
      return `📌 *${currentTask.title.toUpperCase()} — PENDING LIST*\n👥 *Target:* ${yearLabel} (${sectionLabel})\n⚠️ *Total Pending:* ${rolls.length} students\n\n${rolls.join(', ')}`;
    }

    if (template === 'URGENT') {
      return `⚠️ *URGENT ACTION REQUIRED — AIML DEPARTMENT*\n\n📌 *Task:* ${currentTask.title}\n⏰ *Deadline:* ${deadlineStr}\n👥 *Target:* ${yearLabel} (${sectionLabel})\n\nThe following *${rolls.length} students* have NOT completed this mandatory task yet. Please submit your response/proof immediately:\n\n${rolls.join(', ')}\n\n👉 *Submit on Portal:* https://hodportalmic.vercel.app\n\n_— HOD Office, Department of AIML_`;
    }

    // FORMAL Template
    const numberedList = rolls.map((r, i) => `${i + 1}. ${r}`).join('\n');
    return `📢 *DEPARTMENT OF ARTIFICIAL INTELLIGENCE & MACHINE LEARNING*\n*DVR & Dr. HS MIC College of Technology*\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 *NOTICE: PENDING TASK SUBMISSION*\n\n*Task Title:* ${currentTask.title}\n*Academic Session:* 2026-27\n*Submission Deadline:* ${deadlineStr}\n*Target Audience:* ${yearLabel} • ${sectionLabel}\n\n⚠️ *Pending Students:* ${rolls.length} students\n\nThe following students have not yet submitted their required proof/response on the HOD Task Portal. You are hereby instructed to submit before the deadline:\n\n${numberedList}\n\n🔗 *Submission Portal:* https://hodportalmic.vercel.app\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_Head of Department (AIML)_`;
  };

  useEffect(() => {
    if (isOpen && task) {
      const msg = buildNotice(task, currentFilteredStudents, activeSectionTab, templateStyle);
      setNoticeText(msg);
      setCopied(false);
    }
  }, [isOpen, task, activeSectionTab, templateStyle]);

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
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
    success('Opening WhatsApp...');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50/60 via-slate-50/80 to-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#25D366]/15 text-[#128C7E] flex items-center justify-center shrink-0 border border-[#25D366]/30 shadow-xs">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base font-display truncate">
                  WhatsApp Notice Broadcast
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                  Instant Share
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-sm">
          {/* Section Segment Tabs */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
              1. Select Target Section:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveSectionTab('ALL')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSectionTab === 'ALL'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>Combined (A &amp; B)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${activeSectionTab === 'ALL' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {notCompletedStudents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSectionTab('A')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSectionTab === 'A'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>Section A</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${activeSectionTab === 'A' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {countA}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSectionTab('B')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSectionTab === 'B'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>Section B</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-extrabold ${activeSectionTab === 'B' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {countB}
                </span>
              </button>
            </div>
          </div>

          {/* Template Format Selector */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
              2. Notice Template Style:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'FORMAL', label: 'Formal Notice', icon: FileText },
                { id: 'URGENT', label: 'Urgent Alert', icon: AlertTriangle },
                { id: 'ROLLS_ONLY', label: 'Rolls Only', icon: Layers },
              ].map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = templateStyle === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplateStyle(tpl.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tpl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notice Live Editor & Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                3. Live Preview &amp; Edit:
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {currentFilteredStudents.length} pending roll numbers
              </span>
            </div>
            <textarea
              rows={9}
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-inner"
              placeholder="Edit notice text before sending..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors text-center cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
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
              title="Open WhatsApp with pre-filled message"
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
