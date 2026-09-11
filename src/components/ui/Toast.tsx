'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = 'info', duration: number = 3500) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (toasts.length === 0) return;
    const current = toasts[toasts.length - 1];
    const timer = setTimeout(() => {
      removeToast(current.id);
    }, current.duration || 3500);

    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider
      value={{
        toast: addToast,
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info'),
      }}
    >
      {children}
      {/* Top-Middle Executive Floating Notification System */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2.5 max-w-md sm:max-w-lg w-full pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3.5 px-4 sm:px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 transform animate-in fade-in slide-in-from-top-4 zoom-in-95 w-full ${
              t.type === 'success'
                ? 'bg-white/95 text-slate-900 border-emerald-500/30 shadow-emerald-950/10 ring-1 ring-emerald-500/20'
                : t.type === 'error'
                ? 'bg-white/95 text-slate-900 border-rose-500/30 shadow-rose-950/10 ring-1 ring-rose-500/20'
                : 'bg-slate-900/95 text-white border-slate-700/60 shadow-slate-950/20 ring-1 ring-white/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {t.type === 'success' && (
                <span className="p-1.5 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </span>
              )}
              {t.type === 'error' && (
                <span className="p-1.5 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/30 shrink-0">
                  <AlertCircle className="w-5 h-5 stroke-[2.5]" />
                </span>
              )}
              {t.type === 'info' && (
                <span className="p-1.5 rounded-xl bg-blue-500 text-white shadow-md shadow-blue-500/30 shrink-0">
                  <Info className="w-5 h-5 stroke-[2.5]" />
                </span>
              )}
              <div className="min-w-0">
                <p className={`text-xs sm:text-sm font-bold tracking-tight leading-snug truncate ${
                  t.type === 'success' ? 'text-emerald-950' : t.type === 'error' ? 'text-rose-950' : 'text-slate-100'
                }`}>
                  {t.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className={`p-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
                t.type === 'info'
                  ? 'text-slate-400 hover:text-white hover:bg-white/10'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
