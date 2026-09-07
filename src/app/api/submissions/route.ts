import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Task, TaskAssignment, Submission } from '@/lib/models';
import { invalidateCache } from '@/lib/cache';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, student, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'student' || !student) {
      return NextResponse.json({ error: 'Unauthorized. Only assigned students can submit tasks.' }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { task_id, response = null, file_url = null, file_name = null, file_size = null } = body;

    if (!task_id || !mongoose.Types.ObjectId.isValid(task_id)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await Task.findById(task_id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This task is closed or archived and no longer accepting submissions.' }, { status: 400 });
    }

    const studentObjId = new mongoose.Types.ObjectId(student.id);

    // Check assignment
    const assignment = await TaskAssignment.findOne({ task_id, student_id: studentObjId });
    if (!assignment) {
      return NextResponse.json({ error: 'You are not assigned to this task.' }, { status: 403 });
    }

    // Validate submission based on task type
    if (task.type === 'YES_NO') {
      if (response !== 'YES' && response !== 'NO') {
        return NextResponse.json({ error: 'Please select YES or NO.' }, { status: 400 });
      }
    } else if (task.type === 'FILE_SUBMISSION') {
      if (!file_url) {
        return NextResponse.json({ error: 'Please upload the required proof file before submitting.' }, { status: 400 });
      }
    } else if (task.type === 'LINK_CONFIRMATION') {
      if (!response) {
        return NextResponse.json({ error: 'Please confirm completion of the external activity.' }, { status: 400 });
      }
    }

    // Upsert submission
    await Submission.findOneAndUpdate(
      { task_id, student_id: studentObjId },
      {
        response,
        file_url,
        file_name,
        file_size,
        updated_at: new Date(),
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    // Update assignment status
    let newStatus = 'COMPLETED';
    if (task.type === 'YES_NO' && response === 'NO') {
      newStatus = 'PENDING';
    }

    assignment.status = newStatus as 'PENDING' | 'COMPLETED' | 'OVERDUE';
    assignment.completed_at = newStatus === 'COMPLETED' ? new Date() : null;
    await assignment.save();

    invalidateCache('task_detail_');
    invalidateCache('admin_tasks');
    invalidateCache('analytics');
    invalidateCache('students_');

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: newStatus === 'COMPLETED' ? 'Task submitted and marked as completed successfully!' : 'Response recorded as NOT completed.',
      submittedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit task' }, { status: 500 });
  }
}
