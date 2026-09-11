import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from './mongodb';
import { User as UserModel, Student as StudentModel } from './models';

const JWT_SECRET = process.env.JWT_SECRET || 'hod_department_secure_jwt_secret_2026';
const TOKEN_NAME = 'hod_auth_token';

export interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  role: 'admin' | 'student';
  studentId?: string | null;
  rollNumber?: string | null;
  name?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req?: NextRequest): TokenPayload | null {
  let token: string | undefined;

  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookie = req.cookies.get(TOKEN_NAME);
      token = cookie?.value;
    }
  }

  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(TOKEN_NAME)?.value;
    } catch {
      // ignore
    }
  }

  if (!token) return null;
  return verifyToken(token);
}

export async function getAuthenticatedUser(req?: NextRequest): Promise<{
  user: any | null;
  student: any | null;
  session: TokenPayload | null;
}> {
  const session = getSessionFromRequest(req);
  if (!session) return { user: null, student: null, session: null };

  try {
    await connectToDatabase();
    const user = await UserModel.findById(session.userId).lean();
    if (!user) return { user: null, student: null, session: null };

    let student: any = null;
    if (user.student_id) {
      student = await StudentModel.findById(user.student_id).lean();
    }

    return {
      user: {
        id: (user as any)._id.toString(),
        name: user.name || (user.role === 'admin' ? 'Dr. / Prof. (HOD)' : null),
        email: user.email,
        username: user.username,
        role: user.role,
        student_id: user.student_id?.toString() || null,
        is_first_login: user.role === 'student' ? user.is_first_login !== false : false,
        college_email_verified: !!user.college_email_verified,
        college_email: user.college_email || null,
      },
      student: student
        ? {
            id: student._id.toString(),
            roll_number: student.roll_number,
            name: student.name,
            email: student.email,
            phone: student.phone,
            year: student.year,
            section: student.section,
            department: student.department,
            academic_session: student.academic_session,
            status: student.status,
          }
        : null,
      session,
    };
  } catch (err) {
    console.error('Error getting authenticated user:', err);
    return { user: null, student: null, session: null };
  }
}

export { TOKEN_NAME };
