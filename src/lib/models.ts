import mongoose, { Schema, Document, Model } from 'mongoose';

// User Schema
export interface IUser extends Document {
  name?: string;
  email: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'student';
  student_id?: mongoose.Types.ObjectId | null;
  is_first_login?: boolean;
  college_email?: string | null;
  college_email_verified?: boolean;
  created_at: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, default: null, trim: true },
  email: { type: String, trim: true, lowercase: true },
  username: { type: String, required: true, unique: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student'], required: true },
  student_id: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
  is_first_login: { type: Boolean, default: true },
  college_email: { type: String, default: null },
  college_email_verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

// Student Schema
export interface IStudent extends Document {
  roll_number: string;
  name: string;
  email: string;
  phone?: string | null;
  year: '2nd Year' | '3rd Year' | 'Final Year';
  section: 'A' | 'B' | 'C';
  department: string;
  academic_session: string;
  status: 'ACTIVE' | 'DISABLED' | 'GRADUATED';
  created_at: Date;
  updated_at: Date;
}

const StudentSchema = new Schema<IStudent>({
  roll_number: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: null },
  year: { type: String, enum: ['2nd Year', '3rd Year', 'Final Year'], required: true, index: true },
  section: { type: String, enum: ['A', 'B', 'C'], required: true, index: true },
  department: { type: String, default: 'Artificial Intelligence & Machine Learning' },
  academic_session: { type: String, default: '2026-27' },
  status: { type: String, enum: ['ACTIVE', 'DISABLED', 'GRADUATED'], default: 'ACTIVE', index: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});
StudentSchema.index({ status: 1, year: 1, section: 1 });
StudentSchema.index({ status: 1, roll_number: 1 });

// Task Schema
export interface ITask extends Document {
  title: string;
  description: string;
  instructions?: string | null;
  type: 'YES_NO' | 'FILE_SUBMISSION' | 'LINK_CONFIRMATION';
  external_link?: string | null;
  deadline: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  required: number;
  target_type: 'ALL' | 'YEAR' | 'SECTION' | 'YEAR_SECTION' | 'SPECIFIC';
  target_year?: string | null;
  target_section?: string | null;
  target_student_ids?: string[] | null;
  attachment_url?: string | null;
  status: 'ACTIVE' | 'DRAFT' | 'CLOSED' | 'ARCHIVED';
  created_by?: mongoose.Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const TaskSchema = new Schema<ITask>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  instructions: { type: String, default: null },
  type: { type: String, enum: ['YES_NO', 'FILE_SUBMISSION', 'LINK_CONFIRMATION'], required: true },
  external_link: { type: String, default: null },
  deadline: { type: Date, required: true, index: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
  required: { type: Number, default: 1 },
  target_type: { type: String, enum: ['ALL', 'YEAR', 'SECTION', 'YEAR_SECTION', 'SPECIFIC'], default: 'ALL' },
  target_year: { type: String, default: null },
  target_section: { type: String, default: null },
  target_student_ids: { type: [String], default: [] },
  attachment_url: { type: String, default: null },
  status: { type: String, enum: ['ACTIVE', 'DRAFT', 'CLOSED', 'ARCHIVED'], default: 'ACTIVE', index: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});
TaskSchema.index({ status: 1, deadline: 1 });
TaskSchema.index({ status: 1, created_at: -1 });
TaskSchema.index({ created_at: -1 });

// TaskAssignment Schema
export interface ITaskAssignment extends Document {
  task_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  assigned_at: Date;
  completed_at?: Date | null;
}

const TaskAssignmentSchema = new Schema<ITaskAssignment>({
  task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  student_id: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'OVERDUE'], default: 'PENDING', index: true },
  assigned_at: { type: Date, default: Date.now },
  completed_at: { type: Date, default: null },
});
TaskAssignmentSchema.index({ task_id: 1, student_id: 1 }, { unique: true });
TaskAssignmentSchema.index({ task_id: 1, status: 1 });
TaskAssignmentSchema.index({ student_id: 1, status: 1 });

// Submission Schema
export interface ISubmission extends Document {
  task_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  response?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  submitted_at: Date;
  updated_at: Date;
}

const SubmissionSchema = new Schema<ISubmission>({
  task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  student_id: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  response: { type: String, default: null },
  file_url: { type: String, default: null },
  file_name: { type: String, default: null },
  file_size: { type: Number, default: null },
  submitted_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});
SubmissionSchema.index({ task_id: 1, student_id: 1 }, { unique: true });

// AcademicHistory Schema
export interface IAcademicHistory extends Document {
  student_id: mongoose.Types.ObjectId;
  academic_session: string;
  year: string;
  section: string;
  status: string;
  promoted_at: Date;
}

const AcademicHistorySchema = new Schema<IAcademicHistory>({
  student_id: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  academic_session: { type: String, required: true },
  year: { type: String, required: true },
  section: { type: String, required: true },
  status: { type: String, required: true },
  promoted_at: { type: Date, default: Date.now },
});

// AuditLog Schema
export interface IAuditLog extends Document {
  admin_id?: mongoose.Types.ObjectId | null;
  admin_name?: string | null;
  action: string;
  details: string;
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  admin_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  admin_name: { type: String, default: 'Admin' },
  action: { type: String, required: true },
  details: { type: String, required: true },
  created_at: { type: Date, default: Date.now, index: true },
});
AuditLogSchema.index({ created_at: -1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Student: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
export const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
export const TaskAssignment: Model<ITaskAssignment> = mongoose.models.TaskAssignment || mongoose.model<ITaskAssignment>('TaskAssignment', TaskAssignmentSchema);
export const Submission: Model<ISubmission> = mongoose.models.Submission || mongoose.model<ISubmission>('Submission', SubmissionSchema);
export const AcademicHistory: Model<IAcademicHistory> = mongoose.models.AcademicHistory || mongoose.model<IAcademicHistory>('AcademicHistory', AcademicHistorySchema);
export const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// OTP Verification Schema
export interface IOtpVerification extends Document {
  email: string;
  otp: string;
  user_id: mongoose.Types.ObjectId;
  verified: boolean;
  attempts: number;
  expires_at: Date;
  created_at: Date;
}

const OtpVerificationSchema = new Schema<IOtpVerification>({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  otp: { type: String, required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  verified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  expires_at: { type: Date, required: true, index: true },
  created_at: { type: Date, default: Date.now },
});
OtpVerificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const OtpVerification: Model<IOtpVerification> =
  mongoose.models.OtpVerification || mongoose.model<IOtpVerification>('OtpVerification', OtpVerificationSchema);

