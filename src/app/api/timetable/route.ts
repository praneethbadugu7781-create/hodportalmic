import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Timetable, Student } from '@/lib/models';

export const dynamic = 'force-dynamic';

// GET /api/timetable?year=...&section=...
export async function GET(req: NextRequest) {
  try {
    const { user, student, session } = await getAuthenticatedUser(req);
    if (!session || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);

    // If Student: automatically fetch their exact year & section timetable
    if (user.role === 'student') {
      let studentYear = student?.year;
      let studentSection = student?.section;

      if (!studentYear || !studentSection) {
        const studentDoc = await Student.findOne({ roll_number: user.username.toUpperCase() }).lean();
        if (studentDoc) {
          studentYear = studentDoc.year;
          studentSection = studentDoc.section;
        }
      }

      if (!studentYear || !studentSection) {
        return NextResponse.json({
          success: false,
          error: 'Student academic profile missing year or section.',
          timetable: null,
        }, { status: 404 });
      }

      const timetable = await Timetable.findOne({
        year: studentYear,
        section: studentSection,
      }).lean();

      return NextResponse.json({
        success: true,
        timetable: timetable || null,
        studentContext: {
          year: studentYear,
          section: studentSection,
        },
      });
    }

    // If Admin: can query by year & section or fetch list
    const year = searchParams.get('year');
    const section = searchParams.get('section');

    if (year && section) {
      const timetable = await Timetable.findOne({
        year: year as any,
        section: section.toUpperCase() as any,
      }).lean();

      return NextResponse.json({
        success: true,
        timetable: timetable || null,
      });
    }

    // Return all configured timetables for Admin dashboard overview
    const allTimetables = await Timetable.find().sort({ year: 1, section: 1 }).lean();
    return NextResponse.json({
      success: true,
      timetables: allTimetables,
    });
  } catch (error: any) {
    console.error('Error in GET /api/timetable:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch timetable' }, { status: 500 });
  }
}

// POST /api/timetable - Save or update timetable (Admin only)
export async function POST(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin privileges required.' }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { year, section, semester, image_url, schedule, academic_session } = body;

    if (!year || !section) {
      return NextResponse.json({ error: 'Year and Section are required.' }, { status: 400 });
    }

    // Institutional validation: AIML department only has Sections A & B
    if (section !== 'A' && section !== 'B') {
      return NextResponse.json({ error: 'Invalid section. AIML department only has Sections A and B.' }, { status: 400 });
    }

    const sessionYear = academic_session || '2026-27';

    const updated = await Timetable.findOneAndUpdate(
      {
        year: year as any,
        section: section as any,
        academic_session: sessionYear,
      },
      {
        $set: {
          year,
          section,
          semester: semester || 'II-I',
          image_url: image_url || null,
          schedule: Array.isArray(schedule) ? schedule : [],
          department: 'Artificial Intelligence & Machine Learning',
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: `Timetable for ${year} Section ${section} saved and published successfully.`,
      timetable: updated,
    });
  } catch (error: any) {
    console.error('Error in POST /api/timetable:', error);
    return NextResponse.json({ error: error.message || 'Failed to save timetable' }, { status: 500 });
  }
}

// DELETE /api/timetable?id=... or ?year=...&section=...
export async function DELETE(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin privileges required.' }, { status: 403 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const year = searchParams.get('year');
    const section = searchParams.get('section');

    if (id) {
      await Timetable.findByIdAndDelete(id);
    } else if (year && section) {
      await Timetable.deleteOne({ year: year as any, section: section as any });
    } else {
      return NextResponse.json({ error: 'Specify id or year and section to delete.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Timetable removed successfully.',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/timetable:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete timetable' }, { status: 500 });
  }
}
