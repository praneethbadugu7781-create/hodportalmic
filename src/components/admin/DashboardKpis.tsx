'use client';

import React from 'react';
import { Users, CheckCircle2, Clock, AlertTriangle, Layers, ArrowUpRight } from 'lucide-react';

interface DashboardKpisProps {
  totalStudents: number;
  totalCompleted: number;
  totalPending: number;
  totalActiveTasks: number;
  totalOverdue: number;
  overallRate: number;
  loading?: boolean;
  onCardClick?: (type: 'students' | 'completed' | 'pending' | 'tasks' | 'overdue') => void;
}

export function DashboardKpis({
  totalStudents,
  totalCompleted,
  totalPending,
  totalActiveTasks,
  totalOverdue,
  overallRate,
  loading = false,
  onCardClick,
}: DashboardKpisProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs animate-pulse overflow-hidden relative ${
              i === 5 ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 sm:w-20 bg-slate-200 rounded-md" />
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100" />
            </div>
            <div className="mt-3 sm:mt-4 h-7 sm:h-8 w-14 sm:w-16 bg-slate-200 rounded-md" />
            <div className="mt-2.5 sm:mt-3 flex items-center justify-between">
              <div className="h-2.5 w-16 sm:w-24 bg-slate-100 rounded-md" />
              <div className="h-3.5 sm:h-4 w-12 sm:w-14 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      id: 'students' as const,
      label: 'TOTAL STUDENTS',
      value: totalStudents.toLocaleString(),
      subtext: 'Active in Department',
      icon: Users,
      gradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      accentColor: 'text-blue-600 bg-blue-50/80 border-blue-100',
      borderColor: 'border-slate-200/80 hover:border-blue-400 hover:shadow-blue-500/10',
      badge: '132 AIML',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/60',
      highlightBar: 'bg-blue-600',
    },
    {
      id: 'completed' as const,
      label: 'COMPLETED',
      value: totalCompleted.toLocaleString(),
      subtext: `${overallRate}% overall compliance`,
      icon: CheckCircle2,
      gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      accentColor: 'text-emerald-600 bg-emerald-50/80 border-emerald-100',
      borderColor: 'border-slate-200/80 hover:border-emerald-400 hover:shadow-emerald-500/10',
      badge: `${overallRate}% Done`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      highlightBar: 'bg-emerald-600',
    },
    {
      id: 'pending' as const,
      label: 'NOT COMPLETED',
      value: totalPending.toLocaleString(),
      subtext: 'Awaiting student action',
      icon: Clock,
      gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
      accentColor: 'text-amber-600 bg-amber-50/80 border-amber-100',
      borderColor: 'border-slate-200/80 hover:border-amber-400 hover:shadow-amber-500/10',
      badge: totalPending > 0 ? `${totalPending} Action` : 'Zero Pending',
      badgeColor: totalPending > 0 ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 'bg-slate-50 text-slate-600',
      highlightBar: 'bg-amber-500',
    },
    {
      id: 'tasks' as const,
      label: 'ACTIVE TASKS',
      value: totalActiveTasks.toString(),
      subtext: 'Ongoing activities',
      icon: Layers,
      gradient: 'from-indigo-500/10 via-purple-500/5 to-transparent',
      accentColor: 'text-indigo-600 bg-indigo-50/80 border-indigo-100',
      borderColor: 'border-slate-200/80 hover:border-indigo-400 hover:shadow-indigo-500/10',
      badge: 'Published',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
      highlightBar: 'bg-indigo-600',
    },
    {
      id: 'overdue' as const,
      label: 'OVERDUE',
      value: totalOverdue.toString(),
      subtext: 'Missed deadline',
      icon: AlertTriangle,
      gradient: 'from-rose-500/10 via-pink-500/5 to-transparent',
      accentColor: 'text-rose-600 bg-rose-50/80 border-rose-100',
      borderColor: 'border-slate-200/80 hover:border-rose-400 hover:shadow-rose-500/10',
      badge: totalOverdue > 0 ? `${totalOverdue} Urgent` : '0 Overdue',
      badgeColor: totalOverdue > 0 ? 'bg-rose-50 text-rose-700 border-rose-200/60' : 'bg-slate-50 text-slate-600',
      highlightBar: 'bg-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => onCardClick?.(card.id)}
            className={`group relative bg-white rounded-2xl border p-3.5 sm:p-5 transition-all duration-300 cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-1 overflow-hidden ${card.borderColor} ${
              card.id === 'overdue' ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            {/* Ambient Background Gradient Glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />

            {/* Top Row: Label & Floating Icon */}
            <div className="relative flex items-center justify-between gap-1 z-10">
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-slate-900 transition-colors truncate pr-1">
                {card.label}
              </span>
              <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-transform duration-300 group-hover:scale-110 shadow-2xs shrink-0 ${card.accentColor}`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            {/* Main Value */}
            <div className="relative mt-2 sm:mt-3 flex items-baseline justify-between z-10">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {card.value}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
            </div>

            {/* Bottom Row: Subtext & Status Badge */}
            <div className="relative mt-2 sm:mt-2.5 flex items-center justify-between text-xs z-10 gap-1">
              <span className="text-slate-500 font-medium text-[10px] sm:text-[11px] truncate mr-1">{card.subtext}</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full font-bold text-[9px] sm:text-[10px] border shadow-2xs whitespace-nowrap shrink-0 ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>

            {/* Bottom Highlight Indicator Line on Hover */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${card.highlightBar} opacity-0 group-hover:opacity-100 transition-opacity`} />
          </div>
        );
      })}
    </div>
  );
}
