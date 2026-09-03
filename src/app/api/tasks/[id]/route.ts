import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Task, Student, TaskAssignment, Submission } from '@/lib/models';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, student, session } = await getAuthenticatedUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const taskId = params.id;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await Task.findById(taskId).lean();
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Auto-update overdue assignments
    if (new Date() > new Date(task.deadline)) {
      await TaskAssignment.updateMany(
        { task_id: taskId, status: 'PENDING' },
        { status: 'OVERDUE' }
      );
    }

    // If student, return their individual assignment info
    if (user?.role === 'student' && student) {
      const studentObjId = new mongoose.Types.ObjectId(student.id);
      const assignment = await TaskAssignment.findOne({ task_id: taskId, student_id: studentObjId }).lean();
      const submission = await Submission.findOne({ task_id: taskId, student_id: studentObjId }).lean();

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

    // Admin view
    const assignments = await TaskAssignment.find({ task_id: taskId })
      .populate('student_id')
      .lean();

    const submissions = await Submission.find({ task_id: taskId }).lean();

    const completedList: any[] = [];
    const notCompletedList: any[] = [];

    for (const a of assignments) {
      const st: any = a.student_id;
      if (!st) continue;

      if (a.status === 'COMPLETED') {
        const sub = submissions.find((s) => s.student_id.toString() === st._id.toString());
        completedList.push({
          student_id: st._id.toString(),
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
        notCompletedList.push({
          student_id: st._id.toString(),
          roll_number: st.roll_number,
          name: st.name,
          email: st.email,
          phone: st.phone,
          year: st.year,
          section: st.section,
          assignment_status: a.status,
          assigned_at: a.assigned_at,
          completed_at: a.completed_at,
        });
      }
    }

    // Sort
    completedList.sort((a, b) => (b.completed_at || 0) - (a.completed_at || 0));
    notCompletedList.sort((a, b) => a.roll_number.localeCompare(b.roll_number));

    const totalAssigned = completedList.length + notCompletedList.length;
    const completedCount = completedList.length;
    const pendingCount = notCompletedList.filter((s) => s.assignment_status === 'PENDING').length;
    const overdueCount = notCompletedList.filter((s) => s.assignment_status === 'OVERDUE').length;
    const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

    return NextResponse.json({
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
    if (deadline) task.deadline = new Date(deadline);
    if (priority) task.priority = priority;
    if (status) task.status = status;
    task.updated_at = new Date();

    await task.save();
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

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    task.status = 'ARCHIVED';
    task.updated_at = new Date();
    await task.save();

    await logAdminAction(user.id, 'ARCHIVE_TASK', `Archived task: ${task.title}`);

    return NextResponse.json({ success: true, message: 'Task archived successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to archive task' }, { status: 500 });
  }
}
