import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Student, Task, TaskAssignment, AuditLog } from '@/lib/models';
import { getCached, setCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const cacheKey = 'admin_analytics_summary';
    if (!forceRefresh) {
      const cachedData = getCached<any>(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData, {
          headers: { 'X-Cache': 'HIT' }
        });
      }
    }

    await connectToDatabase();

    // Parallel counts & data retrieval
    const [
      totalStudents,
      totalGraduated,
      totalDisabled,
      totalActiveTasks,
      activeStudents,
      activeTasks,
      allAssignments,
      recentActivity,
    ] = await Promise.all([
      Student.countDocuments({ status: 'ACTIVE' }),
      Student.countDocuments({ status: 'GRADUATED' }),
      Student.countDocuments({ status: 'DISABLED' }),
      Task.countDocuments({ status: 'ACTIVE' }),
      Student.find({ status: 'ACTIVE' }).select('year section').lean(),
      Task.find({ status: 'ACTIVE' }).select('title type priority deadline status').sort({ created_at: -1 }).lean(),
      TaskAssignment.find().select('task_id student_id status').lean(),
      AuditLog.find().sort({ created_at: -1 }).limit(10).lean(),
    ]);

    const totalAssigned = allAssignments.length;
    const totalCompleted = allAssignments.filter((a) => a.status === 'COMPLETED').length;
    const totalPending = allAssignments.filter((a) => a.status === 'PENDING').length;
    const totalOverdue = allAssignments.filter((a) => a.status === 'OVERDUE').length;
    const overallCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

    // Student ID sets by year and section
    const studentIdsByYear = new Map<string, Set<string>>();
    const studentIdsBySection = new Map<string, Set<string>>();

    for (const s of activeStudents) {
      const sId = s._id.toString();
      if (!studentIdsByYear.has(s.year)) studentIdsByYear.set(s.year, new Set());
      studentIdsByYear.get(s.year)!.add(sId);

      if (!studentIdsBySection.has(s.section)) studentIdsBySection.set(s.section, new Set());
      studentIdsBySection.get(s.section)!.add(sId);
    }

    const yearStats = ['2nd Year', '3rd Year', 'Final Year'].map((yearName) => {
      const yIds = studentIdsByYear.get(yearName) || new Set();
      const yAssignments = allAssignments.filter((a) => yIds.has(a.student_id.toString()));
      const assigned = yAssignments.length;
      const comp = yAssignments.filter((a) => a.status === 'COMPLETED').length;
      const pend = yAssignments.filter((a) => a.status === 'PENDING').length;
      const over = yAssignments.filter((a) => a.status === 'OVERDUE').length;

      return {
        year: yearName,
        totalStudents: yIds.size,
        totalAssigned: assigned,
        completed: comp,
        pending: pend,
        overdue: over,
        completionRate: assigned > 0 ? Math.round((comp / assigned) * 100) : 0,
      };
    });

    const sectionStats = ['A', 'B', 'C'].map((secName) => {
      const secIds = studentIdsBySection.get(secName) || new Set();
      const secAssignments = allAssignments.filter((a) => secIds.has(a.student_id.toString()));
      const assigned = secAssignments.length;
      const comp = secAssignments.filter((a) => a.status === 'COMPLETED').length;
      const pend = secAssignments.filter((a) => a.status === 'PENDING').length;
      const over = secAssignments.filter((a) => a.status === 'OVERDUE').length;

      return {
        section: secName,
        totalStudents: secIds.size,
        totalAssigned: assigned,
        completed: comp,
        pending: pend,
        overdue: over,
        completionRate: assigned > 0 ? Math.round((comp / assigned) * 100) : 0,
      };
    });

    // Active Task Performance
    const taskPerformance = activeTasks.map((t) => {
      const tAssignments = allAssignments.filter((a) => a.task_id.toString() === t._id.toString());
      const assigned = tAssignments.length;
      const comp = tAssignments.filter((a) => a.status === 'COMPLETED').length;
      const pend = tAssignments.filter((a) => a.status === 'PENDING').length;
      const over = tAssignments.filter((a) => a.status === 'OVERDUE').length;

      return {
        id: t._id.toString(),
        title: t.title,
        type: t.type,
        priority: t.priority,
        deadline: t.deadline,
        status: t.status,
        total_assigned: assigned,
        completed: comp,
        pending: pend,
        overdue: over,
        completion_rate: assigned > 0 ? Math.round((comp / assigned) * 100) : 0,
      };
    });

    const result = {
      summary: {
        totalStudents,
        totalGraduated,
        totalDisabled,
        totalActiveTasks,
        totalAssigned,
        totalCompleted,
        totalPending,
        totalOverdue,
        overallCompletionRate,
      },
      yearStats,
      sectionStats,
      taskPerformance,
      recentActivity: recentActivity.map((l: any) => ({ ...l, id: l._id.toString() })),
    };

    setCached(cacheKey, result, 15); // 15-second TTL cache

    return NextResponse.json(result, {
      headers: { 'X-Cache': 'MISS' }
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
