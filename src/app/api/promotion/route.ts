import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Student, AcademicHistory } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const sampleActiveStudent = await Student.findOne({ status: 'ACTIVE' }).select('academic_session').lean();
    const currentSession = sampleActiveStudent?.academic_session || '2026-27';

    // Calculate next session
    const parts = currentSession.split('-');
    let nextSession = '2027-28';
    if (parts.length === 2) {
      const y1 = parseInt(parts[0], 10);
      const y2 = parseInt(parts[1], 10);
      if (!isNaN(y1) && !isNaN(y2)) {
        nextSession = `${y1 + 1}-${y2 + 1}`;
      }
    }

    const secondYearCount = await Student.countDocuments({ year: '2nd Year', status: 'ACTIVE' });
    const thirdYearCount = await Student.countDocuments({ year: '3rd Year', status: 'ACTIVE' });
    const finalYearCount = await Student.countDocuments({ year: 'Final Year', status: 'ACTIVE' });
    const totalGraduatedCount = await Student.countDocuments({ status: 'GRADUATED' });

    return NextResponse.json({
      currentSession,
      nextSession,
      preview: {
        secondToThird: secondYearCount,
        thirdToFinal: thirdYearCount,
        finalToGraduated: finalYearCount,
        totalActive: secondYearCount + thirdYearCount + finalYearCount,
        existingGraduated: totalGraduatedCount,
      },
    });
  } catch (error: any) {
    console.error('Promotion preview error:', error);
    return NextResponse.json({ error: 'Failed to generate promotion preview' }, { status: 500 });
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
    const { confirm = false, nextSession } = body;

    if (!confirm) {
      return NextResponse.json({ error: 'Confirmation is required to execute academic promotion.' }, { status: 400 });
    }

    const activeStudents = await Student.find({ status: 'ACTIVE' });
    if (activeStudents.length === 0) {
      return NextResponse.json({ error: 'No active students found to promote.' }, { status: 400 });
    }

    const sessionToUse = nextSession || '2027-28';

    let graduatedCount = 0;
    let promotedToFinalCount = 0;
    let promotedToThirdCount = 0;

    for (const s of activeStudents) {
      // Record historical snapshot
      await AcademicHistory.create({
        student_id: s._id,
        academic_session: s.academic_session,
        year: s.year,
        section: s.section,
        status: s.year === 'Final Year' ? 'GRADUATED' : 'PROMOTED',
        promoted_at: new Date(),
      });

      if (s.year === 'Final Year') {
        s.status = 'GRADUATED';
        s.updated_at = new Date();
        await s.save();
        graduatedCount++;
      } else if (s.year === '3rd Year') {
        s.year = 'Final Year';
        s.academic_session = sessionToUse;
        s.updated_at = new Date();
        await s.save();
        promotedToFinalCount++;
      } else if (s.year === '2nd Year') {
        s.year = '3rd Year';
        s.academic_session = sessionToUse;
        s.updated_at = new Date();
        await s.save();
        promotedToThirdCount++;
      }
    }

    await logAdminAction(
      user.id,
      'ACADEMIC_PROMOTION',
      `Promoted academic session to ${sessionToUse}: ${promotedToThirdCount} to 3rd Year, ${promotedToFinalCount} to Final Year, ${graduatedCount} graduated/archived.`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully completed academic promotion to Session ${sessionToUse}!`,
      stats: {
        newSession: sessionToUse,
        promotedToThird: promotedToThirdCount,
        promotedToFinal: promotedToFinalCount,
        graduated: graduatedCount,
      },
    });
  } catch (error: any) {
    console.error('Promotion execution error:', error);
    return NextResponse.json({ error: error.message || 'Academic promotion failed' }, { status: 500 });
  }
}
