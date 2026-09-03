'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '../ui/Toast';

export function AnalyticsView() {
  const { error } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        error(result.error || 'Failed to fetch analytics');
      }
    } catch {
      error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
        Calculating department performance metrics...
      </div>
    );
  }

  const { summary, yearStats, sectionStats, taskPerformance, recentActivity } = data;

  return (
    <div className="space-y-6">
      {/* Top Analytics Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Department Performance Analytics</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive submission progress and compliance tracking
            </p>
          </div>

          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-[11px] font-bold text-emerald-800 uppercase">Overall Completion Rate</div>
              <div className="text-xl font-black text-emerald-900">{summary.overallCompletionRate}%</div>
            </div>
          </div>
        </div>

        {/* Year and Section Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Completion by Academic Year */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Completion by Academic Year
            </h3>

            <div className="space-y-3">
              {yearStats.map((y: any) => (
                <div key={y.year} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800">{y.year}</span>
                    <span className="text-blue-600">{y.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${y.completionRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium pt-0.5">
                    <span>{y.totalStudents} Students</span>
                    <span className="text-emerald-600 font-semibold">{y.completed} Completed</span>
                    <span className="text-amber-600 font-semibold">{y.pending + y.overdue} Pending</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Completion by Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Section Performance Breakdown
            </h3>

            <div className="space-y-3">
              {sectionStats.map((sec: any) => (
                <div key={sec.section} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800">Section {sec.section}</span>
                    <span className="text-indigo-600">{sec.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${sec.completionRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium pt-0.5">
                    <span>{sec.totalStudents} Students</span>
                    <span className="text-emerald-600 font-semibold">{sec.completed} Completed</span>
                    <span className="text-amber-600 font-semibold">{sec.pending + sec.overdue} Pending</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Task Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Task Performance Breakdown</h3>
            <p className="text-xs text-slate-500">Live metrics across all active departmental tasks</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Task Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Assigned</th>
                <th className="py-3 px-4">Completed</th>
                <th className="py-3 px-4">Pending / Overdue</th>
                <th className="py-3 px-4">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {taskPerformance.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">{t.title}</td>
                  <td className="py-3 px-4 text-slate-600">{t.type.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-slate-600">{formatDate(t.deadline)}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{t.total_assigned}</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">{t.completed}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-amber-600">{t.pending}</span>
                    {t.overdue > 0 && (
                      <span className="font-bold text-rose-600 ml-1">({t.overdue} overdue)</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${t.completion_rate}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-700">{t.completion_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Audit Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            <h3 className="text-base font-bold text-slate-900">Recent Administrative Activity Log</h3>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {recentActivity.map((log: any) => (
            <div key={log.id} className="p-4 flex items-start justify-between text-xs hover:bg-slate-50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                    {log.action}
                  </span>
                  <span className="text-slate-500">• By {log.admin_name || 'Admin'}</span>
                </div>
                <div className="text-slate-700 font-medium">{log.details}</div>
              </div>
              <div className="text-slate-400 font-mono text-[11px] shrink-0 ml-4">
                {formatDate(log.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
