'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StudentDashboardView } from '@/components/student/StudentDashboardView';
import { useToast } from '@/components/ui/Toast';

export default function StudentPage() {
  const router = useRouter();
  const { error, info } = useToast();
  const [user, setUser] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (!res.ok || !data.authenticated || data.user?.role !== 'student') {
        router.push('/');
        return;
      }

      setUser(data.user);
      setStudent(data.student);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
        Loading Student Portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        user={user}
        student={student}
        currentSession="2026-27"
        onRefresh={() => {
          checkAuth();
          info('Refreshed student tasks');
        }}
        onOpenProfile={() => setShowProfile(true)}
      />

      <main className="flex-1">
        <StudentDashboardView
          student={student}
          showProfileModal={showProfile}
          onCloseProfileModal={() => setShowProfile(false)}
        />
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <span className="font-bold text-slate-700">DVR & Dr. HS MIC College of Technology</span> • Department of Artificial Intelligence & Machine Learning (AIML)
      </footer>
    </div>
  );
}
