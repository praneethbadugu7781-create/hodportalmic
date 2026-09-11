import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { User, Student, OtpVerification } from '@/lib/models';
import { sendOtpEmail } from '@/lib/mailer';

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

    if (!collegeEmail || typeof collegeEmail !== 'string') {
      return NextResponse.json({ error: 'Please provide your official college email address.' }, { status: 400 });
    }

    const cleanEmail = collegeEmail.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email format. Please enter a valid email address.' }, { status: 400 });
    }

    // Strictly require official college domain
    if (!cleanEmail.endsWith('@mictech.edu.in')) {
      return NextResponse.json(
        { error: 'Only official college email addresses ending with @mictech.edu.in are allowed.' },
        { status: 400 }
      );
    }

    // Ensure email is not already taken by another user
    const userObjectId = new mongoose.Types.ObjectId(user.id);
    const existingUser = await User.findOne({
      email: cleanEmail,
      _id: { $ne: userObjectId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'This college email is already associated with another student account.' },
        { status: 409 }
      );
    }

    // Rate limiting: Maximum 5 requests in 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentRequests = await OtpVerification.countDocuments({
      user_id: userObjectId,
      created_at: { $gte: tenMinutesAgo },
    });

    if (recentRequests >= 5) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // Invalidate previous unverified OTPs for this user
    await OtpVerification.deleteMany({ user_id: userObjectId, verified: false });

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OtpVerification.create({
      email: cleanEmail,
      otp,
      user_id: userObjectId,
      verified: false,
      attempts: 0,
      expires_at: expiresAt,
      created_at: new Date(),
    });

    const mailResult = await sendOtpEmail({
      toEmail: cleanEmail,
      studentName: student?.name || user.username,
      rollNumber: student?.roll_number || user.username,
      otp,
    });

    if (!mailResult.success && !mailResult.isDevFallback) {
      return NextResponse.json(
        { error: mailResult.error || 'Failed to dispatch verification email. Please check SMTP configuration.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}`,
      email: cleanEmail,
      isDevFallback: mailResult.isDevFallback || false,
      // For local testing convenience if SMTP is not yet configured:
      devOtp: mailResult.isDevFallback ? otp : undefined,
    });
  } catch (error: any) {
    console.error('Error in send-otp route:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while sending verification code.' },
      { status: 500 }
    );
  }
}

