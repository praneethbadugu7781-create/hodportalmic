import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, logAdminAction } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { Announcement } from '@/lib/models';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, student, session } = await getAuthenticatedUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // If admin, return all announcements
    if (user?.role === 'admin') {
      const announcements = await Announcement.find({}).sort({ created_at: -1 }).lean();
      return NextResponse.json(
        {
          announcements: announcements.map((a: any) => ({
            ...a,
            id: a._id.toString(),
          })),
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // If student, filter active notices applicable to their year and section
    const studentYear = student?.year || 'all';
    const studentSection = student?.section || 'all';

    const query: any = {
      is_active: true,
      $and: [
        {
          $or: [
            { target_year: 'all' },
            { target_year: { $exists: false } },
            { target_year: null },
            { target_year: studentYear },
          ],
        },
        {
          $or: [
            { target_section: 'all' },
            { target_section: { $exists: false } },
            { target_section: null },
            { target_section: studentSection },
          ],
        },
      ],
    };

    const announcements = await Announcement.find(query).sort({ created_at: -1 }).limit(10).lean();

    return NextResponse.json(
      {
        announcements: announcements.map((a: any) => ({
          ...a,
          id: a._id.toString(),
        })),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
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
      content,
      priority = 'INFO',
      target_year = 'all',
      target_section = 'all',
      posted_by = 'Dr. Head of Department, AIML',
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Announcement title is required' }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Announcement content is required' }, { status: 400 });
    }

    const newAnnouncement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      priority: ['INFO', 'IMPORTANT', 'URGENT'].includes(priority) ? priority : 'INFO',
      target_year: target_year || 'all',
      target_section: target_section || 'all',
      is_active: true,
      posted_by: posted_by || 'Dr. Head of Department, AIML',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await logAdminAction(
      user.id,
      user.name || user.username,
      'CREATE_ANNOUNCEMENT',
      `Published announcement: "${title.trim()}" (Priority: ${priority})`
    );

    return NextResponse.json({
      success: true,
      message: 'Department announcement published successfully!',
      announcement: {
        ...newAnnouncement.toObject(),
        id: newAnnouncement._id.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { id, title, content, priority, target_year, target_section, is_active } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid announcement ID' }, { status: 400 });
    }

    const updateFields: any = { updated_at: new Date() };
    if (title !== undefined) updateFields.title = title.trim();
    if (content !== undefined) updateFields.content = content.trim();
    if (priority !== undefined) updateFields.priority = priority;
    if (target_year !== undefined) updateFields.target_year = target_year;
    if (target_section !== undefined) updateFields.target_section = target_section;
    if (is_active !== undefined) updateFields.is_active = Boolean(is_active);

    const updated = await Announcement.findByIdAndUpdate(id, { $set: updateFields }, { new: true }).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    await logAdminAction(
      user.id,
      user.name || user.username,
      'UPDATE_ANNOUNCEMENT',
      `Updated announcement: "${(updated as any).title}" (Active: ${(updated as any).is_active})`
    );

    return NextResponse.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: {
        ...updated,
        id: (updated as any)._id.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid announcement ID' }, { status: 400 });
    }

    const deleted = await Announcement.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    await logAdminAction(
      user.id,
      user.name || user.username,
      'DELETE_ANNOUNCEMENT',
      `Deleted announcement: "${(deleted as any).title}"`
    );

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}
