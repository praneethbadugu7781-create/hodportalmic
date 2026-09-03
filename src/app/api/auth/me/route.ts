import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, student, session } = await getAuthenticatedUser(req);

    if (!session || !user) {
      return NextResponse.json({ authenticated: false, user: null, student: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
      student,
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: 'Failed to verify session' }, { status: 500 });
  }
}
