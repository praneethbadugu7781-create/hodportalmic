import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Task, Student, TaskAssignment, Submission } from '@/lib/models';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, student, session } = await getAuthenticatedUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Student specific view
    if (user?.role === 'student' && student) {
      const studentObjId = new mongoose.Types.ObjectId(student.id);
      const [assignments, submissions] = await Promise.all([
        TaskAssignment.find({ student_id: studentObjId }).populate('task_id').lean(),
        Submission.find({ student_id: studentObjId }).lean(),
      ]);

      const subMap = new Map(submissions.map((s) => [s.task_id.toString(), s]));

      const studentTasks = assignments
        .filter((a: any) => a.task_id && a.task_id.status === 'ACTIVE')
        .map((a: any) => {
          const t = a.task_id;
          const sub = subMap.get(t._id.toString());
          const isOverdue = a.status === 'PENDING' && new Date() > new Date(t.deadline);
          return {
            ...t,
            id: t._id.toString(),
            assignment_id: a._id.toString(),
            assignment_status: isOverdue ? 'OVERDUE' : a.status,
            assigned_at: a.assigned_at,
            completed_at: a.completed_at,
            submission_id: sub?._id?.toString() || null,
            submission_response: sub?.response || null,
            submission_file_url: sub?.file_url || null,
            submission_file_name: sub?.file_name || null,
            submission_submitted_at: sub?.submitted_at || null,
          };
        });

      return NextResponse.json({ tasks: studentTasks });
    }

    // Admin view
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const forceRefresh = searchParams.get('refresh') === 'true' || searchParams.has('_t');

    const cacheKey = `admin_tasks_${status || 'all'}`;
    if (!forceRefresh) {
      const cached = getCached<any>(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }
    }

    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const [rawTasks, assignmentAgg] = await Promise.all([
      Task.find(query).sort({ created_at: -1 }).lean(),
      TaskAssignment.aggregate([
        {
          $group: {
            _id: '$task_id',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
            overdue: { $sum: { $cond: [{ $eq: ['$status', 'OVERDUE'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const assignmentsByTask = new Map<string, { total: number; completed: number; pending: number; overdue: number }>();

    for (const a of assignmentAgg) {
      if (a._id) {
        assignmentsByTask.set(a._id.toString(), {
          total: a.total || 0,
          completed: a.completed || 0,
          pending: a.pending || 0,
          overdue: a.overdue || 0,
        });
      }
    }

    const tasks = rawTasks.map((t) => {
      const tStats = assignmentsByTask.get(t._id.toString()) || { total: 0, completed: 0, pending: 0, overdue: 0 };
      const completionRate = tStats.total > 0 ? Math.round((tStats.completed / tStats.total) * 100) : 0;

      return {
        ...t,
        id: t._id.toString(),
        total_assigned: tStats.total,
        completed_count: tStats.completed,
        pending_count: tStats.pending,
        overdue_count: tStats.overdue,
        completion_rate: completionRate,
      };
    });

    const responseData = { tasks };
    if (!forceRefresh) {
      setCached(cacheKey, responseData, 6);
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const {
      title,
      description,
      instructions,
      type,
      external_link,
      deadline,
      priority = 'MEDIUM',
      required = 1,
      target_type = 'ALL',
      target_year = null,
      target_section = null,
      target_student_ids = null,
      attachment_url = null,
      status = 'ACTIVE',
    } = body;

    if (!title || !description || !type || !deadline) {
      return NextResponse.json(
        { error: 'Please provide Title, Description, Type, and Deadline.' },
        { status: 400 }
      );
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      instructions: instructions?.trim() || null,
      type,
      external_link: external_link?.trim() || null,
      deadline: new Date(deadline),
      priority,
      required: required ? 1 : 0,
      target_type,
      target_year: target_year || null,
      target_section: target_section || null,
      target_student_ids: target_student_ids || [],
      attachment_url: attachment_url || null,
      status,
      created_by: user.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Find targeted active students
    const studentQuery: any = { status: 'ACTIVE' };
    if (target_type === 'YEAR' && target_year) {
      studentQuery.year = target_year;
    } else if (target_type === 'SECTION' && target_section) {
      if (target_section === 'BOTH' || target_section === 'ALL') {
        studentQuery.section = { $in: ['A', 'B'] };
      } else {
        studentQuery.section = target_section;
      }
    } else if (target_type === 'YEAR_SECTION' && target_year && target_section) {
      studentQuery.year = target_year;
      if (target_section === 'BOTH' || target_section === 'ALL') {
        studentQuery.section = { $in: ['A', 'B'] };
      } else {
        studentQuery.section = target_section;
      }
    } else if (target_type === 'SPECIFIC' && Array.isArray(target_student_ids) && target_student_ids.length > 0) {
      studentQuery._id = { $in: target_student_ids };
    }

    const targetedStudents = await Student.find(studentQuery).select('_id').lean();

    // Batch insert assignments
    if (targetedStudents.length > 0) {
      const assignmentDocs = targetedStudents.map((s) => ({
        task_id: task._id,
        student_id: s._id,
        status: 'PENDING',
        assigned_at: new Date(),
      }));
      await TaskAssignment.insertMany(assignmentDocs, { ordered: false });
    }

    invalidateCache(); // Instantly clear task and analytics cache

    await logAdminAction(
      user.id,
      'CREATE_TASK',
      `Created task "${title}" (Type: ${type}, Assigned to ${targetedStudents.length} students)`
    );

    return NextResponse.json({
      success: true,
      taskId: task._id.toString(),
      assignedCount: targetedStudents.length,
      message: `Task successfully published and assigned to ${targetedStudents.length} students.`,
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: error.message || 'Failed to create task' }, { status: 500 });
  }
}
