'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Save,
} from 'lucide-react';
import { Task, TaskPriority } from '@/lib/types';
import { formatDate, formatForDateTimeLocal, parseTaskDeadline } from '@/lib/utils';
import { useToast } from '../ui/Toast';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any | null;
  onTaskUpdated: () => void;
}

export function TaskEditModal({ isOpen, onClose, task, onTaskUpdated }: TaskEditModalProps) {
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<string>('ACTIVE');

  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setInstructions(task.instructions || '');
      setPriority(task.priority || 'MEDIUM');
      setDeadline(task.deadline ? formatForDateTimeLocal(task.deadline) : '');
      setStatus(task.status || 'ACTIVE');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !deadline) {
      error('Title, Description, and Deadline are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim() || null,
        priority,
        deadline: parseTaskDeadline(deadline).toISOString(),
        status,
      };

      const res = await fetch(`/api/tasks/${task.id || task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        success('Task updated successfully!');
        onTaskUpdated();
        onClose();
      } else {
        error(data.error || 'Failed to update task');
      }
    } catch {
      error('Network error updating task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 sm:p-6 text-white relative flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-200 bg-blue-500/30 px-2.5 py-0.5 rounded-full border border-blue-400/20 inline-block mb-1">
              Task Settings &amp; Deadline
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
              Edit Task: {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Lab Submission"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description *
            </label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed explanation of the task"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium resize-none"
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="ACTIVE">Active (Live for Students)</option>
                <option value="DRAFT">Draft</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Deadline Date & Time */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Submission Deadline (Date &amp; Time) *
            </label>
            <input
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
            />

            {/* Live IST Timezone Preview */}
            <div className="mt-2 p-2.5 rounded-xl bg-blue-50/90 border border-blue-200/80 flex items-center justify-between text-xs">
              <span className="font-extrabold text-blue-800 flex items-center gap-1.5">
                <span>🇮🇳</span> Indian Standard Time (IST)
              </span>
              <span className="font-black text-slate-900">
                {deadline ? formatDate(parseTaskDeadline(deadline)) : 'Select timing'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              The exact timing chosen above will be enforced across all student dashboards and reports.
            </p>
          </div>

          {/* Instructions (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Additional Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Guidelines, required file naming, or lab expectations"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium resize-none"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving Changes...' : 'Save & Apply Timing'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
