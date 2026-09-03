import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Student, Task, TaskAssignment, AuditLog } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    // Auto update overdue
    const now = new Date();
    const overdueTasks = await Task.find({ deadline: { $lt: now } }).select('_id');
    if (overdueTasks.length > 0) {
      const overdueIds = overdueTasks.map((t) => t._id);
      await TaskAssignment.updateMany(
        { task_id: { $in: overdueIds }, status: 'PENDING' },
        { status: 'OVERDUE' }
      );
    }

    const totalStudents = await Student.countDocuments({ status: 'ACTIVE' });
    const totalGraduated = await Student.countDocuments({ status: 'GRADUATED' });
    const totalDisabled = await Student.countDocuments({ status: 'DISABLED' });
    const totalActiveTasks = await Task.countDocuments({ status: 'ACTIVE' });

    const allAssignments = await TaskAssignment.find().lean();
    const totalAssigned = allAssignments.length;
    const totalCompleted = allAssignments.filter((a) => a.status === 'COMPLETED').length;
    const totalPending = allAssignments.filter((a) => a.status === 'PENDING').length;
    const totalOverdue = allAssignments.filter((a) => a.status === 'OVERDUE').length;
    const overallCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

    // Year Stats
    const activeStudents = await Student.find({ status: 'ACTIVE' }).lean();
    const studentMap = new Map(activeStudents.map((s) => [s._id.toString(), s]));

    const yearStats = ['2nd Year', '3rd Year', 'Final Year'].map((yearName) => {
      const yStudents = activeStudents.filter((s) => s.year === yearName);
      const yStudentIds = new Set(yStudents.map((s) => s._id.toString()));
      const yAssignments = allAssignments.filter((a) => yStudentIds.has(a.student_id.toString()));
      const assigned = yAssignments.length;
      const comp = yAssignments.filter((a) => a.status === 'COMPLETED').length;
      const pend = yAssignments.filter((a) => a.status === 'PENDING').length;
      const over = yAssignments.filter((a) => a.status === 'OVERDUE').length;

      return {
        year: yearName,
        totalStudents: yStudents.length,
        totalAssigned: assigned,
        completed: comp,
        pending: pend,
        overdue: over,
        completionRate: assigned > 0 ? Math.round((comp / assigned) * 100) : 0,
      };
    });

    // Section Stats
    const sectionStats = ['A', 'B', 'C'].map((secName) => {
      const secStudents = activeStudents.filter((s) => s.section === secName);
      const secStudentIds = new Set(secStudents.map((s) => s._id.toString()));
      const secAssignments = allAssignments.filter((a) => secStudentIds.has(a.student_id.toString()));
      const assigned = secAssignments.length;
      const comp = secAssignments.filter((a) => a.status === 'COMPLETED').length;
      const pend = secAssignments.filter((a) => a.status === 'PENDING').length;
      const over = secAssignments.filter((a) => a.status === 'OVERDUE').length;

      return {
        section: secName,
        totalStudents: secStudents.length,
        totalAssigned: assigned,
        completed: comp,
        pending: pend,
        overdue: over,
        completionRate: assigned > 0 ? Math.round((comp / assigned) * 100) : 0,
      };
    });

    // Active Task Performance
    const activeTasks = await Task.find({ status: 'ACTIVE' }).sort({ created_at: -1 }).lean();
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

    // Audit logs
    const recentActivity = await AuditLog.find().sort({ created_at: -1 }).limit(15).lean();

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
