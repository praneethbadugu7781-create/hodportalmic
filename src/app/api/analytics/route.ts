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
    const forceRefresh = searchParams.get('refresh') === 'true' || searchParams.has('_t');

    const cacheKey = 'admin_analytics_summary';
    if (!forceRefresh) {
      const cachedData = getCached<any>(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }
    }

    await connectToDatabase();

    // Run 4 optimized, database-level aggregations & projections concurrently
    const [studentStats, activeTasks, assignmentAgg, recentActivity] = await Promise.all([
      // 1. Single aggregation for all student status, year, and section counts
      Student.aggregate([
        {
          $group: {
            _id: { status: '$status', year: '$year', section: '$section' },
            count: { $sum: 1 },
          },
        },
      ]),

      // 2. Fast lean projection for active tasks
      Task.find({ status: 'ACTIVE' })
        .select('title type priority deadline status created_at')
        .sort({ created_at: -1 })
        .lean(),

      // 3. Database-level aggregation for assignment performance breakdown
      TaskAssignment.aggregate([
        {
          $lookup: {
            from: 'students',
            localField: 'student_id',
            foreignField: '_id',
            as: 'student',
          },
        },
        { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              taskId: '$task_id',
              year: '$student.year',
              section: '$student.section',
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // 4. Fast indexed query for recent audit logs
      AuditLog.find()
        .select('action admin_name details created_at')
        .sort({ created_at: -1 })
        .limit(10)
        .lean(),
    ]);

    // Parse student counts by status, year, section
    let totalStudents = 0;
    let totalGraduated = 0;
    let totalDisabled = 0;
    const studentsByYear: Record<string, number> = { '2nd Year': 0, '3rd Year': 0, 'Final Year': 0 };
    const studentsBySection: Record<string, number> = { 'A': 0, 'B': 0 };

    for (const s of studentStats) {
      const { status, year, section } = s._id || {};
      const count = s.count || 0;
      if (status === 'ACTIVE') {
        totalStudents += count;
        if (year && studentsByYear[year] !== undefined) studentsByYear[year] += count;
        if (section && studentsBySection[section] !== undefined) studentsBySection[section] += count;
      } else if (status === 'GRADUATED') {
        totalGraduated += count;
      } else if (status === 'DISABLED') {
        totalDisabled += count;
      }
    }

    // Parse assignment breakdown in O(1)
    let totalAssigned = 0;
    let totalCompleted = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    const yearData: Record<string, { assigned: number; completed: number; pending: number; overdue: number }> = {
      '2nd Year': { assigned: 0, completed: 0, pending: 0, overdue: 0 },
      '3rd Year': { assigned: 0, completed: 0, pending: 0, overdue: 0 },
      'Final Year': { assigned: 0, completed: 0, pending: 0, overdue: 0 },
    };

    const sectionData: Record<string, { assigned: number; completed: number; pending: number; overdue: number }> = {
      'A': { assigned: 0, completed: 0, pending: 0, overdue: 0 },
      'B': { assigned: 0, completed: 0, pending: 0, overdue: 0 },
    };

    const taskStatsMap = new Map<string, { total: number; completed: number; pending: number; overdue: number }>();

    for (const item of assignmentAgg) {
      const { taskId, year, section, status } = item._id || {};
      const count = item.count || 0;

      totalAssigned += count;
      if (status === 'COMPLETED') totalCompleted += count;
      else if (status === 'PENDING') totalPending += count;
      else if (status === 'OVERDUE') totalOverdue += count;

      if (year && yearData[year]) {
        yearData[year].assigned += count;
        if (status === 'COMPLETED') yearData[year].completed += count;
        else if (status === 'PENDING') yearData[year].pending += count;
        else if (status === 'OVERDUE') yearData[year].overdue += count;
      }

      if (section && sectionData[section]) {
        sectionData[section].assigned += count;
        if (status === 'COMPLETED') sectionData[section].completed += count;
        else if (status === 'PENDING') sectionData[section].pending += count;
        else if (status === 'OVERDUE') sectionData[section].overdue += count;
      }

      if (taskId) {
        const tIdStr = taskId.toString();
        if (!taskStatsMap.has(tIdStr)) {
          taskStatsMap.set(tIdStr, { total: 0, completed: 0, pending: 0, overdue: 0 });
        }
        const tStats = taskStatsMap.get(tIdStr)!;
        tStats.total += count;
        if (status === 'COMPLETED') tStats.completed += count;
        else if (status === 'PENDING') tStats.pending += count;
        else if (status === 'OVERDUE') tStats.overdue += count;
      }
    }

    const overallCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

    const yearStats = ['2nd Year', '3rd Year', 'Final Year'].map((yearName) => {
      const y = yearData[yearName] || { assigned: 0, completed: 0, pending: 0, overdue: 0 };
      return {
        year: yearName,
        totalStudents: studentsByYear[yearName] || 0,
        totalAssigned: y.assigned,
        completed: y.completed,
        pending: y.pending,
        overdue: y.overdue,
        completionRate: y.assigned > 0 ? Math.round((y.completed / y.assigned) * 100) : 0,
      };
    });

    const sectionStats = ['A', 'B'].map((secName) => {
      const s = sectionData[secName] || { assigned: 0, completed: 0, pending: 0, overdue: 0 };
      return {
        section: secName,
        totalStudents: studentsBySection[secName] || 0,
        totalAssigned: s.assigned,
        completed: s.completed,
        pending: s.pending,
        overdue: s.overdue,
        completionRate: s.assigned > 0 ? Math.round((s.completed / s.assigned) * 100) : 0,
      };
    });

    const taskPerformance = activeTasks.map((t: any) => {
      const tStats = taskStatsMap.get(t._id.toString()) || { total: 0, completed: 0, pending: 0, overdue: 0 };
      return {
        id: t._id.toString(),
        title: t.title,
        type: t.type,
        priority: t.priority,
        deadline: t.deadline,
        status: t.status,
        total_assigned: tStats.total,
        completed: tStats.completed,
        pending: tStats.pending,
        overdue: tStats.overdue,
        completion_rate: tStats.total > 0 ? Math.round((tStats.completed / tStats.total) * 100) : 0,
      };
    });

    const result = {
      summary: {
        totalStudents,
        totalGraduated,
        totalDisabled,
        totalActiveTasks: activeTasks.length,
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

    if (!forceRefresh) {
      setCached(cacheKey, result, 6);
    }

    return NextResponse.json(result, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
