export interface AdminProfile {
  name: string;
  role: string;
  email: string;
  school: string;
  schoolId: string;
  academicYear: string;
  term: string;
  campus: string;
}

export interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  attendanceRate: number;
  gpa: number;
  status: 'Active' | 'On Leave' | 'Graduated' | 'Pending';
  enrolledDate: string;
  avatarUrl?: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  department: string;
  email: string;
  classesCount: number;
  status: 'Active' | 'On Leave';
  avatarUrl?: string;
}

export interface CourseClass {
  id: string;
  code: string;
  title: string;
  grade: string;
  instructor: string;
  room: string;
  schedule: string;
  enrolledStudents: number;
  capacity: number;
}

export type CbcRating = 'EE' | 'ME' | 'AE' | 'BE';

export interface SubjectItem {
  id: string;
  code: string;
  name: string;
  department: string;
  curriculum_type: 'numeric' | 'cbc' | 'both';
}

export interface AssessmentItem {
  id: string;
  title: string;
  class_id: string;
  subject_id: string;
  term_id: string;
  assessment_type: string;
  evaluation_system: 'numeric' | 'cbc';
  max_score: number;
  weightage: number;
  strand_name?: string;
  sub_strand?: string;
  created_at: string;
}

export interface AssessmentResultItem {
  id: string;
  assessment_id: string;
  student_id: string;
  student_code?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  student_grade?: string;
  section?: string;
  class_id: string;
  subject_id: string;
  term_id: string;
  evaluation_system: 'numeric' | 'cbc';
  raw_score?: number | null;
  percentage?: number | null;
  grade_letter?: string | null;
  cbc_rating?: CbcRating | null;
  teacher_comment?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeAccountItem {
  id: string;
  student_id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  grade: string;
  section: string;
  guardian_name: string;
  guardian_phone: string;
  avatar_url?: string;
  term_id: string;
  account_number: string;
  fee_structure_name: string;
  total_billed: number | string;
  amount_paid: number | string;
  balance: number | string;
  status: 'PENDING' | 'PARTIAL' | 'CLEARED' | 'OVERPAID';
  due_date?: string;
  payment_history?: PaymentRecordItem[];
}

export interface PaymentRecordItem {
  id: string;
  checkout_request_id: string;
  merchant_request_id?: string;
  student_id: string;
  student_code?: string;
  first_name?: string;
  last_name?: string;
  grade?: string;
  parent_id?: string;
  parent_phone: string;
  amount: number | string;
  mpesa_receipt_number?: string;
  transaction_date?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  result_code?: number;
  result_desc?: string;
  created_at: string;
  updated_at?: string;
}

export type TabType = 'students' | 'teachers' | 'classes' | 'attendance' | 'grading' | 'finance' | 'reports';

