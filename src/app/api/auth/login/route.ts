import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, Student } from '@/lib/models';
import { comparePassword, signToken, TOKEN_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { identifier, password, role } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Please provide identifier (email or roll number) and password.' },
        { status: 400 }
      );
    }

    const cleanId = String(identifier).trim();

    // Query user by email or username (case-insensitive)
    let user = await User.findOne({
      $or: [
        { email: cleanId.toLowerCase() },
        { username: cleanId.toLowerCase() },
        { username: cleanId },
      ],
    });

    // If not found and identifier might be a student roll number, try finding by student roll_number
    if (!user) {
      const student = await Student.findOne({ roll_number: cleanId.toUpperCase() });
      if (student) {
        user = await User.findOne({ student_id: student._id });
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials. User not found.' },
        { status: 401 }
      );
    }

    // Check role match if specifically requested
    if (role && user.role !== role) {
      return NextResponse.json(
        { error: `Account exists but is not registered as a ${role}.` },
        { status: 403 }
      );
    }

    // Verify password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid password. Please check your credentials.' },
        { status: 401 }
      );
    }

    let studentData: any = null;
    if (user.role === 'student' && user.student_id) {
      studentData = await Student.findById(user.student_id).lean();
      if (studentData && studentData.status === 'DISABLED') {
        return NextResponse.json(
          { error: 'Your student account is currently disabled. Please contact department admin.' },
          { status: 403 }
        );
      }
    }

    // Sign JWT token
    const token = signToken({
      userId: user._id.toString(),
      username: user.username,
      email: user.email || '',
      role: user.role,
      studentId: user.student_id ? user.student_id.toString() : null,
      rollNumber: studentData?.roll_number,
      name: studentData?.name || user.username,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        student_id: user.student_id?.toString() || null,
      },
      student: studentData ? { ...studentData, id: studentData._id.toString() } : null,
      role: user.role,
    });

    // Set cookie
    response.cookies.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during login. Please verify your MongoDB connection in .env.local.' },
      { status: 500 }
    );
  }
}
