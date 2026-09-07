import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Student, User, TaskAssignment, Submission, AcademicHistory } from '@/lib/models';
import { invalidateCache } from '@/lib/cache';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { studentIds } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Please provide an array of student IDs to delete.' }, { status: 400 });
    }

    const validIds = studentIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid student IDs found.' }, { status: 400 });
    }

    // Delete in bulk
    await Promise.all([
      Student.deleteMany({ _id: { $in: validIds } }),
      User.deleteMany({ student_id: { $in: validIds } }),
      TaskAssignment.deleteMany({ student_id: { $in: validIds } }),
      Submission.deleteMany({ student_id: { $in: validIds } }),
      AcademicHistory.deleteMany({ student_id: { $in: validIds } }),
    ]);

    await logAdminAction(user.id, 'BULK_DELETE_STUDENTS', `Permanently deleted ${validIds.length} students`);

    invalidateCache('students_');
    invalidateCache('analytics');
    invalidateCache('task_detail_');
    invalidateCache('admin_tasks');

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${validIds.length} students and their records.`,
      deletedCount: validIds.length,
    });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete students' }, { status: 500 });
  }
}
