import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthenticatedUser, hashPassword, signToken, TOKEN_NAME } from '@/lib/auth';
import { User, Student, OtpVerification } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, student, session } = await getAuthenticatedUser(req);
    if (!session || !user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized. Student session required.' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const collegeEmail = body.collegeEmail || body.college_email;
    const newPassword = body.newPassword || body.new_password;

    if (!collegeEmail || !newPassword) {
      return NextResponse.json({ error: 'College email and new password are required.' }, { status: 400 });
    }

    const cleanEmail = String(collegeEmail).trim().toLowerCase();
    const rawPass = String(newPassword).trim();

    if (rawPass.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters in length.' }, { status: 400 });
    }

    // Security requirement: New password cannot be the student's roll number
    if (rawPass.toUpperCase() === user.username.toUpperCase()) {
      return NextResponse.json(
        { error: 'For your security, your new password cannot be your roll number.' },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(user.id);

    // Verify that this email was successfully verified by OTP for this student
    const verifiedOtp = await OtpVerification.findOne({
      user_id: userObjectId,
      email: cleanEmail,
      verified: true,
    });

    if (!verifiedOtp) {
      return NextResponse.json(
        { error: 'Email verification is required before setting a new password. Please verify your OTP code first.' },
        { status: 403 }
      );
    }

    // Hash the new password
    const passwordHash = await hashPassword(rawPass);

    // Update User credentials and onboarding status
    const userDoc = await User.findById(userObjectId);
    if (!userDoc) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    userDoc.password_hash = passwordHash;
    userDoc.email = cleanEmail;
    userDoc.college_email = cleanEmail;
    userDoc.college_email_verified = true;
    userDoc.is_first_login = false;
    await userDoc.save();

    // Update Student record email
    let updatedStudent: any = student;
    if (userDoc.student_id) {
      await Student.updateOne(
        { _id: userDoc.student_id },
        { $set: { email: cleanEmail, updated_at: new Date() } }
      );
      updatedStudent = await Student.findById(userDoc.student_id).lean();
    }

    // Clean up OTP records for this user
    await OtpVerification.deleteMany({ user_id: userObjectId });

    // Issue refreshed token with verified email and updated flags
    const token = signToken({
      userId: userDoc._id.toString(),
      username: userDoc.username,
      email: cleanEmail,
      role: 'student',
      studentId: userDoc.student_id ? userDoc.student_id.toString() : null,
      rollNumber: updatedStudent?.roll_number || userDoc.username,
      name: updatedStudent?.name || userDoc.username,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password set successfully! Your student account is now fully active.',
      user: {
        id: userDoc._id.toString(),
        username: userDoc.username,
        email: cleanEmail,
        role: 'student',
        is_first_login: false,
        college_email_verified: true,
      },
      student: updatedStudent ? { ...updatedStudent, id: updatedStudent._id.toString() } : null,
    });

    response.cookies.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Error in set-password route:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while updating your password.' },
      { status: 500 }
    );
  }
}

