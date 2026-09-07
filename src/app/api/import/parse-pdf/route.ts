import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Student } from '@/lib/models';
import { extractStudentsFromPdf } from '@/lib/pdf-parser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const defaultYear = (formData.get('defaultYear') as string) || '3rd Year';
    const defaultSection = (formData.get('defaultSection') as string) || 'A';
    const defaultDepartment = (formData.get('defaultDepartment') as string) || 'Artificial Intelligence & Machine Learning';

    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { students, totalDetected } = await extractStudentsFromPdf(buffer, {
      defaultYear,
      defaultSection,
      defaultDepartment,
    });

    if (students.length === 0) {
      return NextResponse.json({
        error: 'No student records could be detected in this PDF. Please ensure the PDF has readable text (not a scanned image) containing roll numbers.',
        totalDetected: 0,
        validCount: 0,
        invalidCount: 0,
        validRows: [],
        invalidRows: [],
      }, { status: 422 });
    }

    // Dry-run validation against existing database records
    const existingStudents = await Student.find().select('roll_number').lean();
    const existingRolls = new Set(existingStudents.map((s) => s.roll_number.toUpperCase()));

    const validRows: any[] = [];
    const invalidRows: { row: number; roll_number: string; reason: string }[] = [];
    const seenInBatch = new Set<string>();

    students.forEach((s, idx) => {
      const rowNum = idx + 1;
      const roll = s.roll_number.toUpperCase();

      if (existingRolls.has(roll)) {
        invalidRows.push({
          row: rowNum,
          roll_number: roll,
          reason: `Roll number '${roll}' already exists in database.`,
        });
        return;
      }

      if (seenInBatch.has(roll)) {
        invalidRows.push({
          row: rowNum,
          roll_number: roll,
          reason: `Duplicate roll number '${roll}' within this PDF.`,
        });
        return;
      }
      seenInBatch.add(roll);

      validRows.push(s);
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      totalRecords: students.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      validRows: validRows.slice(0, 100),
      allValidRecords: validRows,
      invalidRows,
      extractedCount: students.length,
    });
  } catch (error: any) {
    console.error('PDF Import error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to parse PDF file. Please verify file integrity.',
    }, { status: 500 });
  }
}
