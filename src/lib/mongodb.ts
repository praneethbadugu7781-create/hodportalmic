import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const DEFAULT_URI = 'mongodb+srv://praneethbadugu30_db_user:5Xp6jLldoU8EAT1d@cluster0.acsdqb7.mongodb.net/hod_portal?retryWrites=true&w=majority&appName=Cluster0';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  adminEnsured?: boolean;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null, adminEnsured: false };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    let uri = process.env.MONGODB_URI || DEFAULT_URI;
    
    if (uri.includes('<db_username>')) {
      uri = uri.replace('<db_username>', 'praneethbadugu30_db_user');
    }
    if (uri.includes('<db_password>')) {
      uri = uri.replace('<db_password>', '5Xp6jLldoU8EAT1d');
    }

    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 20000,
    };

    cached.promise = mongoose.connect(uri, opts).then(async (m) => {
      if (!cached.adminEnsured) {
        ensureAdminExists(m).catch((e) => console.error('Admin init check error:', e.message));
        cached.adminEnsured = true;
      }
      return m;
    }).catch((err) => {
      console.error('MongoDB connection error:', err.message);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

async function ensureAdminExists(m: typeof mongoose) {
  try {
    const UserModel = m.models.User || (await import('./models')).User;
    const existingAdmin = await UserModel.findOne({ role: 'admin' }).select('_id').lean();
    if (!existingAdmin) {
      console.log('Creating initial Department Admin account...');
      const password_hash = await bcrypt.hash('admin123', 10);
      await UserModel.create({
        email: 'admin@department.edu',
        username: 'admin',
        password_hash,
        role: 'admin',
        created_at: new Date(),
      });
      console.log('Default HOD Admin created: admin@department.edu / admin123');
    }
  } catch (err: any) {
    console.error('Error ensuring admin exists:', err.message);
  }
}

export async function logAdminAction(adminId: any, action: string, details: string, adminName: string = 'Admin') {
  try {
    await connectToDatabase();
    const { AuditLog } = await import('./models');
    await AuditLog.create({
      admin_id: adminId || null,
      admin_name: adminName,
      action,
      details,
      created_at: new Date(),
    });
  } catch (err: any) {
    console.error('Failed to log admin action:', err.message);
  }
}
