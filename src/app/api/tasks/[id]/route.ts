import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Task, Student, TaskAssignment, Submission } from '@/lib/models';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import { parseTaskDeadline } from '@/lib/utils';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, student, session } = await getAuthenticatedUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = params.id;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true' || searchParams.has('_t');

    // Fast cache for admin view
    const cacheKey = `task_detail_${taskId}`;
    if (user?.role === 'admin' && !forceRefresh) {
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

    await connectToDatabase();

    const task = await Task.findById(taskId).lean();
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // If student, return their individual assignment info
    if (user?.role === 'student' && student) {
      const studentObjId = new mongoose.Types.ObjectId(student.id);
      const [assignment, submission] = await Promise.all([
        TaskAssignment.findOne({ task_id: taskId, student_id: studentObjId }).lean(),
        Submission.findOne({ task_id: taskId, student_id: studentObjId }).lean(),
      ]);

      return NextResponse.json({
        task: { ...task, id: (task as any)._id.toString() },
        assignment: assignment
          ? {
              ...(assignment as any),
              id: (assignment as any)._id.toString(),
              submission_response: submission?.response || null,
              submission_file_url: submission?.file_url || null,
              submission_file_name: submission?.file_name || null,
              submission_submitted_at: submission?.submitted_at || null,
            }
          : null,
      });
    }

    // Admin view: fetch assignments and submissions in parallel
    const [assignments, submissions] = await Promise.all([
      TaskAssignment.find({ task_id: taskId })
        .populate({
          path: 'student_id',
          select: 'roll_number name email phone year section',
        })
        .lean(),
      Submission.find({ task_id: taskId })
        .select('student_id response file_url file_name file_size submitted_at')
        .lean(),
    ]);

    const subMap = new Map<string, any>();
    for (const sub of submissions) {
      subMap.set(sub.student_id.toString(), sub);
    }

    const now = new Date();
    const isPastDeadline = now > new Date(task.deadline);

    const completedList: any[] = [];
    const notCompletedList: any[] = [];

    for (const a of assignments) {
      const st: any = a.student_id;
      if (!st) continue;

      const stIdStr = st._id.toString();

      if (a.status === 'COMPLETED') {
        const sub = subMap.get(stIdStr);
        completedList.push({
          student_id: stIdStr,
          roll_number: st.roll_number,
          name: st.name,
          email: st.email,
          phone: st.phone,
          year: st.year,
          section: st.section,
          assignment_status: a.status,
          assigned_at: a.assigned_at,
          completed_at: a.completed_at,
          submission_id: sub?._id?.toString() || null,
          submission_response: sub?.response || null,
          submission_file_url: sub?.file_url || null,
          submission_file_name: sub?.file_name || null,
          submission_file_size: sub?.file_size || null,
          submission_submitted_at: sub?.submitted_at || null,
        });
      } else {
        const dynamicStatus = isPastDeadline && a.status === 'PENDING' ? 'OVERDUE' : a.status;
        notCompletedList.push({
          student_id: stIdStr,
          roll_number: st.roll_number,
          name: st.name,
          email: st.email,
          phone: st.phone,
          year: st.year,
          section: st.section,
          assignment_status: dynamicStatus,
          assigned_at: a.assigned_at,
          completed_at: a.completed_at,
        });
      }
    }

    // Sort
    completedList.sort((a, b) => (new Date(b.completed_at || 0).getTime()) - (new Date(a.completed_at || 0).getTime()));
    notCompletedList.sort((a, b) => a.roll_number.localeCompare(b.roll_number));

    const totalAssigned = completedList.length + notCompletedList.length;
    const completedCount = completedList.length;
    const pendingCount = notCompletedList.filter((s) => s.assignment_status === 'PENDING').length;
    const overdueCount = notCompletedList.filter((s) => s.assignment_status === 'OVERDUE').length;
    const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

    const responseData = {
      task: {
        ...task,
        id: (task as any)._id.toString(),
        total_assigned: totalAssigned,
        completed_count: completedCount,
        pending_count: pendingCount,
        overdue_count: overdueCount,
        completion_rate: completionRate,
      },
      completed: completedList,
      not_completed: notCompletedList,
      summary: {
        total_assigned: totalAssigned,
        completed_count: completedCount,
        pending_count: pendingCount,
        overdue_count: overdueCount,
        completion_rate: completionRate,
      },
    };

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
    console.error('Error fetching task details:', error);
    return NextResponse.json({ error: 'Failed to fetch task details' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const taskId = params.id;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const body = await req.json();
    const { title, description, instructions, external_link, deadline, priority, status } = body;

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (title) task.title = title.trim();
    if (description) task.description = description.trim();
    if (instructions !== undefined) task.instructions = instructions?.trim() || null;
    if (external_link !== undefined) task.external_link = external_link?.trim() || null;
    if (deadline) task.deadline = parseTaskDeadline(deadline);
    if (priority) task.priority = priority;
    if (status) task.status = status;
    task.updated_at = new Date();

    await task.save();
    invalidateCache(); // Clear cache

    await logAdminAction(user.id, 'EDIT_TASK', `Updated task: ${task.title}`);

    return NextResponse.json({ success: true, message: 'Task updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const taskId = params.id;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'permanent';

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (mode === 'archive') {
      task.status = 'ARCHIVED';
      task.updated_at = new Date();
      await task.save();
      invalidateCache();
      await logAdminAction(user.id, 'ARCHIVE_TASK', `Archived task: ${task.title}`);
      return NextResponse.json({ success: true, message: 'Task archived successfully' });
    }

    // Permanent delete: task, assignments, and submissions
    await Promise.all([
      Task.findByIdAndDelete(taskId),
      TaskAssignment.deleteMany({ task_id: taskId }),
      Submission.deleteMany({ task_id: taskId }),
    ]);

    invalidateCache();
    await logAdminAction(user.id, 'DELETE_TASK', `Permanently deleted task: ${task.title}`);

    return NextResponse.json({
      success: true,
      message: `Task "${task.title}" and its submissions have been deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete task' }, { status: 500 });
  }
}
