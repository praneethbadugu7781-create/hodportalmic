import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Task, Student, TaskAssignment, Submission } from '@/lib/models';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, student, session } = await getAuthenticatedUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Auto-update pending assignments where deadline passed to OVERDUE
    const now = new Date();
    const overdueTasks = await Task.find({ deadline: { $lt: now } }).select('_id');
    const overdueTaskIds = overdueTasks.map((t) => t._id);
    if (overdueTaskIds.length > 0) {
      await TaskAssignment.updateMany(
        { task_id: { $in: overdueTaskIds }, status: 'PENDING' },
        { status: 'OVERDUE' }
      );
    }

    // Student specific view
    if (user?.role === 'student' && student) {
      const studentObjId = new mongoose.Types.ObjectId(student.id);
      const assignments = await TaskAssignment.find({ student_id: studentObjId })
        .populate('task_id')
        .lean();

      const submissions = await Submission.find({ student_id: studentObjId }).lean();

      const studentTasks = assignments
        .filter((a: any) => a.task_id && a.task_id.status === 'ACTIVE')
        .map((a: any) => {
          const t = a.task_id;
          const sub = submissions.find((s) => s.task_id.toString() === t._id.toString());
          return {
            ...t,
            id: t._id.toString(),
            assignment_id: a._id.toString(),
            assignment_status: a.status,
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
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const rawTasks = await Task.find(query).sort({ created_at: -1 }).lean();
    const taskIds = rawTasks.map((t) => t._id);
    const allAssignments = await TaskAssignment.find({ task_id: { $in: taskIds } }).lean();

    const tasks = rawTasks.map((t) => {
      const tAssignments = allAssignments.filter((a) => a.task_id.toString() === t._id.toString());
      const total = tAssignments.length;
      const completed = tAssignments.filter((a) => a.status === 'COMPLETED').length;
      const pending = tAssignments.filter((a) => a.status === 'PENDING').length;
      const overdue = tAssignments.filter((a) => a.status === 'OVERDUE').length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        ...t,
        id: t._id.toString(),
        total_assigned: total,
        completed_count: completed,
        pending_count: pending,
        overdue_count: overdue,
        completion_rate: completionRate,
      };
    });

    return NextResponse.json({ tasks });
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
      studentQuery.section = target_section;
    } else if (target_type === 'YEAR_SECTION' && target_year && target_section) {
      studentQuery.year = target_year;
      studentQuery.section = target_section;
    } else if (target_type === 'SPECIFIC' && Array.isArray(target_student_ids) && target_student_ids.length > 0) {
      studentQuery._id = { $in: target_student_ids };
    }

    const targetedStudents = await Student.find(studentQuery).select('_id');

    // Batch insert assignments
    if (targetedStudents.length > 0) {
      const assignmentDocs = targetedStudents.map((s) => ({
        task_id: task._id,
        student_id: s._id,
        status: 'PENDING',
        assigned_at: new Date(),
      }));
      await TaskAssignment.insertMany(assignmentDocs);
    }

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
