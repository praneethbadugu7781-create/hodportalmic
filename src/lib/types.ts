export type Role = 'admin' | 'student';

export type AcademicYear = '2nd Year' | '3rd Year' | 'Final Year';
export type Section = 'A' | 'B' | 'C';
export type StudentStatus = 'ACTIVE' | 'DISABLED' | 'GRADUATED';
export type TaskType = 'YES_NO' | 'FILE_SUBMISSION' | 'LINK_CONFIRMATION';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'ACTIVE' | 'DRAFT' | 'CLOSED' | 'ARCHIVED';
export type AssignmentStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE';
export type TargetType = 'ALL' | 'YEAR' | 'SECTION' | 'YEAR_SECTION' | 'SPECIFIC';

export interface User {
  id: number;
  email: string;
  username: string;
  role: Role;
  student_id?: number | null;
  created_at: string;
}

export interface Student {
  id: number;
  roll_number: string;
  name: string;
  email: string;
  phone?: string | null;
  year: AcademicYear;
  section: Section;
  department: string;
  academic_session: string;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  instructions?: string | null;
  type: TaskType;
  external_link?: string | null;
  deadline: string;
  priority: TaskPriority;
  required: number; // 1 or 0
  target_type: TargetType;
  target_year?: AcademicYear | null;
  target_section?: Section | null;
  target_student_ids?: string | null; // JSON array of numbers
  attachment_url?: string | null;
  status: TaskStatus;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  total_assigned?: number;
  completed_count?: number;
  pending_count?: number;
  overdue_count?: number;
  completion_rate?: number;
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  student_id: number;
  status: AssignmentStatus;
  assigned_at: string;
  completed_at?: string | null;
  // Joined fields
  student_roll_number?: string;
  student_name?: string;
  student_email?: string;
  student_year?: AcademicYear;
  student_section?: Section;
  task_title?: string;
  task_deadline?: string;
  task_type?: TaskType;
  submission?: Submission | null;
}

export interface Submission {
  id: number;
  task_id: number;
  student_id: number;
  response?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  submitted_at: string;
  updated_at: string;
}

export interface AcademicHistory {
  id: number;
  student_id: number;
  academic_session: string;
  year: AcademicYear;
  section: Section;
  status: string;
  promoted_at: string;
}

export interface AuditLog {
  id: number;
  admin_id?: number | null;
  admin_name?: string | null;
  action: string;
  details: string;
  created_at: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalActiveTasks: number;
  totalSubmissions: number;
  totalPendingAssignments: number;
  totalCompletedAssignments: number;
  overallCompletionRate: number;
  overdueAssignmentsCount: number;
  yearStats: {
    year: AcademicYear;
    totalStudents: number;
    completionRate: number;
  }[];
  sectionStats: {
    section: Section;
    totalStudents: number;
    completionRate: number;
  }[];
  recentActivity: AuditLog[];
}
