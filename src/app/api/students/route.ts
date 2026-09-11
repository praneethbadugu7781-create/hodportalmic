import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser, hashPassword } from '@/lib/auth';
import { Student, User, Task, TaskAssignment, AcademicHistory } from '@/lib/models';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const year = searchParams.get('year') || '';
    const section = searchParams.get('section') || '';
    const status = searchParams.get('status') || 'ACTIVE';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const cacheKey = `students_${search}_${year}_${section}_${status}_${page}_${limit}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (year && year !== 'all') {
      query.year = year;
    }

    if (section && section !== 'all') {
      query.section = section;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ roll_number: regex }, { name: regex }, { email: regex }];
    }

    // Parallel count and find
    const [total, rawStudents] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .sort({ roll_number: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Attach task completion counts using lean projection and O(1) map
    const studentIds = rawStudents.map((s) => s._id);
    const assignments = await TaskAssignment.find({ student_id: { $in: studentIds } })
      .select('student_id status')
      .lean();

    const assignMap = new Map<string, { total: number; completed: number; pending: number; overdue: number }>();
    for (const a of assignments) {
      const sId = a.student_id.toString();
      let entry = assignMap.get(sId);
      if (!entry) {
        entry = { total: 0, completed: 0, pending: 0, overdue: 0 };
        assignMap.set(sId, entry);
      }
      entry.total++;
      if (a.status === 'COMPLETED') entry.completed++;
      else if (a.status === 'PENDING') entry.pending++;
      else if (a.status === 'OVERDUE') entry.overdue++;
    }

    const students = rawStudents.map((s) => {
      const counts = assignMap.get(s._id.toString()) || { total: 0, completed: 0, pending: 0, overdue: 0 };
      return {
        ...s,
        id: s._id.toString(),
        total_assigned_tasks: counts.total,
        completed_tasks_count: counts.completed,
        pending_tasks_count: counts.pending,
        overdue_tasks_count: counts.overdue,
      };
    });

    const responsePayload = {
      students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };

    setCached(cacheKey, responsePayload, 15);
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
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
      roll_number,
      name,
      email,
      phone,
      year,
      section,
      department = 'Artificial Intelligence & Machine Learning',
      academic_session = '2026-27',
      password,
    } = body;

    if (!roll_number || !name || !email || !year || !section) {
      return NextResponse.json(
        { error: 'Missing required fields (Roll Number, Name, Email, Year, Section).' },
        { status: 400 }
      );
    }

    const cleanRoll = roll_number.trim().toUpperCase();

    // Check duplicate
    const existing = await Student.findOne({ roll_number: cleanRoll });
    if (existing) {
      return NextResponse.json(
        { error: `Roll number '${cleanRoll}' already exists in the system.` },
        { status: 409 }
      );
    }

    // Create student
    const student = await Student.create({
      roll_number: cleanRoll,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      year,
      section,
      department,
      academic_session,
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create user login - default password is student roll number with first-time setup required
    const rawPass = password?.trim() || cleanRoll;
    const passHash = await hashPassword(rawPass);
    await User.create({
      email: email.trim().toLowerCase(),
      username: cleanRoll,
      password_hash: passHash,
      role: 'student',
      student_id: student._id,
      is_first_login: true,
      created_at: new Date(),
    });

    // Create academic history
    await AcademicHistory.create({
      student_id: student._id,
      academic_session,
      year,
      section,
      status: 'ENROLLED',
      promoted_at: new Date(),
    });

    // Auto-assign active matching tasks
    const activeTasks = await Task.find({ status: 'ACTIVE' });
    for (const task of activeTasks) {
      let isTargeted = false;
      if (task.target_type === 'ALL') isTargeted = true;
      else if (task.target_type === 'YEAR' && task.target_year === year) isTargeted = true;
      else if (task.target_type === 'SECTION' && task.target_section === section) isTargeted = true;
      else if (task.target_type === 'YEAR_SECTION' && task.target_year === year && task.target_section === section) isTargeted = true;

      if (isTargeted) {
        await TaskAssignment.findOneAndUpdate(
          { task_id: task._id, student_id: student._id },
          { $setOnInsert: { task_id: task._id, student_id: student._id, status: 'PENDING', assigned_at: new Date() } },
          { upsert: true }
        );
      }
    }

    await logAdminAction(user.id, 'ADD_STUDENT', `Added student ${name} (${cleanRoll}) in ${year} Sec ${section}`);

    invalidateCache('students_');
    invalidateCache('analytics');

    return NextResponse.json({
      success: true,
      studentId: student._id.toString(),
      message: 'Student registered successfully',
    });
  } catch (error: any) {
    console.error('Error adding student:', error);
    return NextResponse.json({ error: error.message || 'Failed to add student' }, { status: 500 });
  }
}
