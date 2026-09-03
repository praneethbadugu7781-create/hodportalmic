import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Task, Student, TaskAssignment } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const task = await Task.findById(taskId).lean();
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const pendingAssignments = await TaskAssignment.find({
      task_id: taskId,
      status: { $in: ['PENDING', 'OVERDUE'] },
    })
      .populate('student_id')
      .lean();

    const pendingStudents: any[] = [];
    for (const a of pendingAssignments) {
      const st: any = a.student_id;
      if (!st) continue;
      pendingStudents.push({
        id: st._id.toString(),
        roll_number: st.roll_number,
        name: st.name,
        email: st.email,
        phone: st.phone,
        year: st.year,
        section: st.section,
        assignment_status: a.status,
      });
    }

    pendingStudents.sort((a, b) => a.roll_number.localeCompare(b.roll_number));

    const rollNumbers = pendingStudents.map((s) => s.roll_number);
    const newlineText = rollNumbers.join('\n');
    const commaText = rollNumbers.join(', ');
    const withNamesText = pendingStudents
      .map((s) => `${s.roll_number} - ${s.name} (${s.year}, Sec ${s.section})`)
      .join('\n');

    const formattedDeadline = formatDate(task.deadline.toISOString());
    const reminderMessage = `Dear Students,\n\nThe following roll numbers have NOT completed "${task.title}".\nDeadline: ${formattedDeadline}\n\nPlease complete and submit your required task immediately.\n\nPending Roll Numbers (${rollNumbers.length} students):\n${newlineText}\n\n- Department of Artificial Intelligence & Machine Learning (AIML)`;

    return NextResponse.json({
      taskId,
      taskTitle: task.title,
      totalPending: rollNumbers.length,
      rollNumbers,
      pendingStudents,
      formats: {
        newline: newlineText,
        comma: commaText,
        withNames: withNamesText,
        reminderMessage,
      },
    });
  } catch (error: any) {
    console.error('Error fetching copy pending data:', error);
    return NextResponse.json({ error: 'Failed to generate pending roll numbers' }, { status: 500 });
  }
}
