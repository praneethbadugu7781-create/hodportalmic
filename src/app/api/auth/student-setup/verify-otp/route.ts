import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/lib/auth';
import { OtpVerification } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, session } = await getAuthenticatedUser(req);
    if (!session || !user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized. Student session required.' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const collegeEmail = body.collegeEmail || body.college_email;
    const otp = body.otp;

    if (!collegeEmail || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const cleanEmail = String(collegeEmail).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit verification code.' }, { status: 400 });
    }

    const userObjectId = new mongoose.Types.ObjectId(user.id);

    // Look for active OTP record
    const otpRecord = await OtpVerification.findOne({
      user_id: userObjectId,
      email: cleanEmail,
      expires_at: { $gt: new Date() },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Verification code has expired or was not requested. Please click Resend Code.' },
        { status: 400 }
      );
    }

    if (otpRecord.attempts >= 5) {
      await OtpVerification.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { error: 'Too many incorrect attempts. This code has been invalidated for security. Please request a new code.' },
        { status: 429 }
      );
    }

    if (otpRecord.otp !== cleanOtp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      return NextResponse.json(
        { error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
        { status: 400 }
      );
    }

    // Success: mark as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return NextResponse.json({
      success: true,
      message: 'Email address verified successfully!',
      verifiedEmail: cleanEmail,
    });
  } catch (error: any) {
    console.error('Error in verify-otp route:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred while verifying code.' },
      { status: 500 }
    );
  }
}

