'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  ArrowRight,
  Archive,
  AlertTriangle,
  CheckCircle2,
  X,
  History,
  ShieldAlert,
} from 'lucide-react';
import { useToast } from '../ui/Toast';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPromotionSuccess: () => void;
}

export function PromotionModal({ isOpen, onClose, onPromotionSuccess }: PromotionModalProps) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [nextSession, setNextSession] = useState('2027-28');
  const [confirmChecked, setConfirmChecked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPreview();
      setConfirmChecked(false);
    }
  }, [isOpen]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/promotion');
      const data = await res.json();
      if (res.ok) {
        setPreview(data);
        if (data.nextSession) setNextSession(data.nextSession);
      } else {
        error('Failed to fetch promotion preview');
      }
    } catch {
      error('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePromotion = async () => {
    if (!confirmChecked) {
      error('Please check the confirmation box to proceed.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/promotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, nextSession }),
      });

      const data = await res.json();
      if (res.ok) {
        success(data.message || 'Academic promotion completed successfully!');
        onPromotionSuccess();
        onClose();
      } else {
        error(data.error || 'Promotion execution failed');
      }
    } catch {
      error('An error occurred during promotion');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Academic Session Promotion</h3>
              <p className="text-xs text-slate-500">
                Transition department students to the next academic year
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold text-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Calculating student year counts...
            </div>
          ) : (
            <>
              {/* Session Transition Header Card */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Current Session</span>
                  <div className="text-xl font-black text-slate-900">{preview?.currentSession || '2026-27'}</div>
                </div>

                <ArrowRight className="w-6 h-6 text-blue-500" />

                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase">Next Academic Session</span>
                  <input
                    type="text"
                    value={nextSession}
                    onChange={(e) => setNextSession(e.target.value)}
                    className="mt-0.5 px-3 py-1 font-black text-base rounded-lg border border-blue-300 bg-white text-blue-900 w-28 text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Promotion Flow Cards */}
              <div className="space-y-2.5">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">2nd Year</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-blue-600">3rd Year</span>
                  </div>
                  <span className="font-extrabold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 text-xs">
                    {preview?.preview?.secondToThird || 0} Students
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">3rd Year</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-indigo-600">Final Year</span>
                  </div>
                  <span className="font-extrabold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 text-xs">
                    {preview?.preview?.thirdToFinal || 0} Students
                  </span>
                </div>

                <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">Final Year</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-rose-700 flex items-center gap-1">
                      <Archive className="w-3.5 h-3.5" /> Graduated / Archived
                    </span>
                  </div>
                  <span className="font-extrabold text-rose-800 bg-white px-3 py-1 rounded-lg border border-rose-200 text-xs">
                    {preview?.preview?.finalToGraduated || 0} Students
                  </span>
                </div>
              </div>

              {/* History Preservation Notice */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>Historical Data & Compliance Protection</span>
                </div>
                <p>
                  Final Year students are <strong>NOT deleted</strong>. Their full profile, task history, and submitted proofs are safely archived under the <strong>"Graduated / Archive"</strong> section and their session record is permanently logged in <code>academic_history</code>.
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-slate-700 leading-relaxed">
                    I confirm the academic promotion of{' '}
                    <strong>{preview?.preview?.totalActive || 0} active students</strong> to session{' '}
                    <strong>{nextSession}</strong>.
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleExecutePromotion}
            disabled={!confirmChecked || submitting}
            className="flex items-center gap-1.5 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            <GraduationCap className="w-4 h-4" />
            <span>{submitting ? 'Promoting...' : 'Confirm & Execute Promotion'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
