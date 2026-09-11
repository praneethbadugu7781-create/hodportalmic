import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, AuditLog } from '@/lib/models';
import { getAuthenticatedUser, comparePassword, hashPassword, signToken, TOKEN_NAME } from '@/lib/auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    await connectToDatabase();
    const adminDoc = await User.findById(user.id).select('-password_hash').lean();
    if (!adminDoc) {
      return NextResponse.json({ error: 'Admin account not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: adminDoc._id.toString(),
        name: adminDoc.name || 'Dr. / Prof. (HOD)',
        email: adminDoc.email,
        username: adminDoc.username,
        role: adminDoc.role,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json({ error: 'Failed to retrieve profile.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { name, email, username, currentPassword, newPassword } = body;

    const adminDoc = await User.findById(user.id);
    if (!adminDoc) {
      return NextResponse.json({ error: 'Admin account not found.' }, { status: 404 });
    }

    // If changing password or sensitive credentials, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Please enter your current password to authorize setting a new password.' },
          { status: 400 }
        );
      }

      const isCurrentMatch = await comparePassword(currentPassword, adminDoc.password_hash);
      if (!isCurrentMatch) {
        return NextResponse.json(
          { error: 'Current password does not match. Please re-enter your existing password correctly.' },
          { status: 400 }
        );
      }

      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters in length.' },
          { status: 400 }
        );
      }

      adminDoc.password_hash = await hashPassword(newPassword.trim());
    }

    // Update Email
    if (email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
      }

      // Check uniqueness
      const existingEmail = await User.findOne({
        email: cleanEmail,
        _id: { $ne: adminDoc._id },
      });
      if (existingEmail) {
        return NextResponse.json({ error: 'This email address is already in use by another account.' }, { status: 400 });
      }

      adminDoc.email = cleanEmail;
    }

    // Update Username
    if (username && typeof username === 'string') {
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3) {
        return NextResponse.json({ error: 'Username must be at least 3 characters long.' }, { status: 400 });
      }

      // Check uniqueness
      const existingUsername = await User.findOne({
        username: cleanUsername,
        _id: { $ne: adminDoc._id },
      });
      if (existingUsername) {
        return NextResponse.json({ error: 'This username is already taken. Please choose another.' }, { status: 400 });
      }

      adminDoc.username = cleanUsername;
    }

    // Update Name
    if (name !== undefined && typeof name === 'string') {
      adminDoc.name = name.trim() || 'Dr. / Prof. (HOD)';
    }

    await adminDoc.save();

    // Log Audit Trail
    try {
      await AuditLog.create({
        admin_id: adminDoc._id,
        admin_name: adminDoc.name || 'Dr. / Prof. (HOD)',
        action: 'UPDATE_ADMIN_PROFILE',
        details: `Updated HOD profile (name: ${adminDoc.name || 'HOD'}, email: ${adminDoc.email}, username: ${adminDoc.username}${newPassword ? ', password changed' : ''})`,
      });
    } catch {
      // Non-blocking audit log
    }

    // Re-issue refreshed JWT session token
    const newToken = signToken({
      userId: adminDoc._id.toString(),
      username: adminDoc.username,
      email: adminDoc.email || '',
      role: 'admin',
      name: adminDoc.name,
    });

    const response = NextResponse.json({
      success: true,
      message: 'HOD profile & security credentials updated successfully!',
      user: {
        id: adminDoc._id.toString(),
        name: adminDoc.name,
        email: adminDoc.email,
        username: adminDoc.username,
        role: adminDoc.role,
      },
    });

    response.cookies.set(TOKEN_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json({ error: 'An error occurred while updating profile.' }, { status: 500 });
  }
}
