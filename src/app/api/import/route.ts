import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser, hashPassword } from '@/lib/auth';
import { Student, User, Task, TaskAssignment, AcademicHistory } from '@/lib/models';
import { AcademicYear, Section } from '@/lib/types';

export const dynamic = 'force-dynamic';

function normalizeYear(yearStr: string): AcademicYear | null {
  const y = String(yearStr).trim().toLowerCase();
  if (y.includes('2') || y.includes('second')) return '2nd Year';
  if (y.includes('3') || y.includes('third')) return '3rd Year';
  if (y.includes('final') || y.includes('4') || y.includes('fourth')) return 'Final Year';
  return null;
}

function normalizeSection(secStr: string): Section | null {
  const s = String(secStr).trim().toUpperCase();
  if (s === 'A' || s === 'B' || s === 'C') return s as Section;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { records, isDryRun = false, academic_session = '2026-27' } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No student records provided for import.' }, { status: 400 });
    }

    const existingStudents = await Student.find().select('roll_number').lean();
    const existingRolls = new Set(existingStudents.map((s) => s.roll_number.toUpperCase()));

    const validRows: any[] = [];
    const invalidRows: { row: number; roll_number: string; reason: string }[] = [];
    const seenInBatch = new Set<string>();

    records.forEach((rec: any, idx: number) => {
      const rowNum = idx + 1;
      const roll = String(rec.roll_number || rec.RollNumber || rec.Roll || rec['Roll No'] || '').trim().toUpperCase();
      const name = String(rec.name || rec.Name || rec['Full Name'] || '').trim();
      const email = String(rec.email || rec.Email || '').trim().toLowerCase();
      const phone = String(rec.phone || rec.Phone || rec.Mobile || '').trim() || null;
      const rawYear = String(rec.year || rec.Year || rec.AcademicYear || '');
      const rawSection = String(rec.section || rec.Section || '');

      if (!roll) {
        invalidRows.push({ row: rowNum, roll_number: roll, reason: 'Roll number is missing.' });
        return;
      }

      if (!name) {
        invalidRows.push({ row: rowNum, roll_number: roll, reason: 'Student name is missing.' });
        return;
      }

      if (existingRolls.has(roll)) {
        invalidRows.push({ row: rowNum, roll_number: roll, reason: `Roll number '${roll}' already exists in database.` });
        return;
      }

      if (seenInBatch.has(roll)) {
        invalidRows.push({ row: rowNum, roll_number: roll, reason: `Duplicate roll number '${roll}' within this file.` });
        return;
      }
      seenInBatch.add(roll);

      const year = normalizeYear(rawYear);
      if (!year) {
        invalidRows.push({ row: rowNum, roll_number: roll, reason: `Invalid Year '${rawYear}'. Must be 2nd Year, 3rd Year, or Final Year.` });
        return;
      }

      const section = normalizeSection(rawSection);
      if (!section) {
        invalidRows.push({ row: rowNum, roll_number: roll, reason: `Invalid Section '${rawSection}'. Must be A, B, or C.` });
        return;
      }

      const cleanEmail = email || `${roll.toLowerCase()}@department.edu`;

      validRows.push({
        roll_number: roll,
        name,
        email: cleanEmail,
        phone,
        year,
        section,
        department: rec.department || 'Artificial Intelligence & Machine Learning',
        academic_session,
      });
    });

    if (isDryRun) {
      return NextResponse.json({
        isDryRun: true,
        totalRecords: records.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        validRows: validRows.slice(0, 50),
        invalidRows,
      });
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: 'No valid student records found to import.', errors: invalidRows },
        { status: 400 }
      );
    }

    const defaultPasswordHash = await hashPassword('student123');
    const activeTasks = await Task.find({ status: 'ACTIVE' });

    for (const row of validRows) {
      const student = await Student.create({
        roll_number: row.roll_number,
        name: row.name,
        email: row.email,
        phone: row.phone,
        year: row.year,
        section: row.section,
        department: row.department,
        academic_session: row.academic_session,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await User.create({
        email: row.email,
        username: row.roll_number,
        password_hash: defaultPasswordHash,
        role: 'student',
        student_id: student._id,
        created_at: new Date(),
      });

      await AcademicHistory.create({
        student_id: student._id,
        academic_session: row.academic_session,
        year: row.year,
        section: row.section,
        status: 'ENROLLED',
        promoted_at: new Date(),
      });

      // Auto-assign active tasks
      for (const task of activeTasks) {
        let targeted = false;
        if (task.target_type === 'ALL') targeted = true;
        else if (task.target_type === 'YEAR' && task.target_year === row.year) targeted = true;
        else if (task.target_type === 'SECTION' && task.target_section === row.section) targeted = true;
        else if (task.target_type === 'YEAR_SECTION' && task.target_year === row.year && task.target_section === row.section) targeted = true;

        if (targeted) {
          await TaskAssignment.findOneAndUpdate(
            { task_id: task._id, student_id: student._id },
            { $setOnInsert: { task_id: task._id, student_id: student._id, status: 'PENDING', assigned_at: new Date() } },
            { upsert: true }
          );
        }
      }
    }

    await logAdminAction(
      user.id,
      'BULK_IMPORT_STUDENTS',
      `Imported ${validRows.length} students (${invalidRows.length} skipped)`
    );

    return NextResponse.json({
      success: true,
      totalProcessed: records.length,
      importedCount: validRows.length,
      skippedCount: invalidRows.length,
      errors: invalidRows,
      message: `Successfully imported ${validRows.length} students.`,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message || 'Bulk import failed' }, { status: 500 });
  }
}
