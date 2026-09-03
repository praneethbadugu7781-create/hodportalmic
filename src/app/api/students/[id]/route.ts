import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Student, User, Task, TaskAssignment, Submission, AcademicHistory } from '@/lib/models';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, student: currentStudent, session } = await getAuthenticatedUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const studentId = params.id;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    // Role check: Students can only view their own profile
    if (user?.role === 'student' && currentStudent?.id !== studentId) {
      return NextResponse.json({ error: 'Access denied. You can only view your own profile.' }, { status: 403 });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch assignments with task info and submissions
    const rawAssignments = await TaskAssignment.find({ student_id: studentId })
      .populate('task_id')
      .lean();

    const submissions = await Submission.find({ student_id: studentId }).lean();

    const assignments = rawAssignments.map((a: any) => {
      const task = a.task_id;
      const sub = submissions.find((s) => s.task_id?.toString() === task?._id?.toString());

      return {
        assignment_id: a._id.toString(),
        assignment_status: a.status,
        assigned_at: a.assigned_at,
        completed_at: a.completed_at,
        task_id: task?._id.toString(),
        task_title: task?.title || 'Unknown Task',
        task_description: task?.description || '',
        task_type: task?.type,
        task_priority: task?.priority,
        task_deadline: task?.deadline,
        task_required: task?.required,
        submission_id: sub?._id?.toString() || null,
        submission_response: sub?.response || null,
        submission_file_url: sub?.file_url || null,
        submission_file_name: sub?.file_name || null,
        submission_file_size: sub?.file_size || null,
        submission_submitted_at: sub?.submitted_at || null,
      };
    });

    // Fetch academic history
    const rawHistory = await AcademicHistory.find({ student_id: studentId })
      .sort({ promoted_at: -1 })
      .lean();

    const history = rawHistory.map((h) => ({
      ...h,
      id: h._id.toString(),
    }));

    // Metrics
    const totalAssigned = assignments.length;
    const completedCount = assignments.filter((a) => a.assignment_status === 'COMPLETED').length;
    const pendingCount = assignments.filter((a) => a.assignment_status === 'PENDING').length;
    const overdueCount = assignments.filter((a) => a.assignment_status === 'OVERDUE').length;
    const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

    return NextResponse.json({
      student: {
        ...student,
        id: student._id.toString(),
      },
      assignments,
      history,
      metrics: {
        totalAssigned,
        completedCount,
        pendingCount,
        overdueCount,
        completionRate,
      },
    });
  } catch (error: any) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json({ error: 'Failed to load student profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const studentId = params.id;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, phone, year, section, status } = body;

    const existing = await Student.findById(studentId);
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (name) existing.name = name.trim();
    if (email) existing.email = email.trim().toLowerCase();
    if (phone !== undefined) existing.phone = phone ? phone.trim() : null;
    if (year) existing.year = year;
    if (section) existing.section = section;
    if (status) existing.status = status;
    existing.updated_at = new Date();

    await existing.save();

    if (email) {
      await User.updateOne({ student_id: studentId }, { email: email.trim().toLowerCase() });
    }

    await logAdminAction(user.id, 'EDIT_STUDENT', `Updated details for ${existing.roll_number} (${existing.name})`);

    return NextResponse.json({ success: true, message: 'Student updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const studentId = params.id;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    student.status = 'DISABLED';
    student.updated_at = new Date();
    await student.save();

    await logAdminAction(user.id, 'DISABLE_STUDENT', `Disabled student account for ${student.roll_number} (${student.name})`);

    return NextResponse.json({ success: true, message: 'Student account has been disabled' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to disable student' }, { status: 500 });
  }
}
