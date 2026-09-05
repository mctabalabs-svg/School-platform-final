import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Printer,
  RefreshCw,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  Sparkles,
  ExternalLink,
  Phone,
  Mail,
  UserCheck,
  Check,
  Search,
  Filter,
} from 'lucide-react';
import { UserSession } from './LoginModal';

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  class_code?: string;
  class_title?: string;
}

export interface AcademicResult {
  id: string;
  raw_score: number | string;
  percentage: number | string;
  grade_letter?: string;
  cbc_rating?: 'EE' | 'ME' | 'AE' | 'BE';
  teacher_comment?: string;
  evaluation_system: 'numeric' | 'cbc';
  created_at: string;
  assessment_title: string;
  assessment_type: string;
  max_score: number | string;
  weightage?: number | string;
  strand_name?: string;
  sub_strand?: string;
  subject_name: string;
  subject_code: string;
}

export interface SubjectProgress {
  subject_name: string;
  subject_code: string;
  average_percentage: number;
  assessments_count: number;
  proficiency_level: 'EE' | 'ME' | 'AE' | 'BE';
}

export interface LinkedStudentData {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  student_name: string;
  grade: string;
  section: string;
  email: string;
  avatar_url?: string;
  gpa?: number | string;
  relationship: string;
  attendance: {
    total_days: number;
    present_days: number;
    absent_days: number;
    late_days: number;
    attendance_rate: number;
    recent_logs: AttendanceRecord[];
  };
  academic_progress: {
    overall_average: number;
    total_assessments: number;
    cbc_breakdown: {
      EE: number;
      ME: number;
      AE: number;
      BE: number;
    };
    subject_progress: SubjectProgress[];
    recent_results: AcademicResult[];
  };
  fee_account?: {
    total_billed: number | string;
    amount_paid: number | string;
    balance: number | string;
    status: 'PENDING' | 'PARTIAL' | 'CLEARED' | 'OVERPAID';
    due_date?: string;
  } | null;
}

export interface ParentDashboardViewProps {
  session: UserSession;
  onNavigateTab?: (tab: string) => void;
}

export const ParentDashboardView: React.FC<ParentDashboardViewProps> = ({
  session,
  onNavigateTab,
}) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parentProfile, setParentProfile] = useState<any>(null);
  const [linkedChildren, setLinkedChildren] = useState<LinkedStudentData[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Strictly enforce parent role check
  const isParentRole = session.role === 'parent';

  const fetchDashboardData = async () => {
    if (!isParentRole) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('ga_auth_token') || session.token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/parent/dashboard', {
        headers,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setParentProfile(data.parent);
        setLinkedChildren(data.linked_children || []);
        if (data.linked_children && data.linked_children.length > 0) {
          setSelectedChildId(data.linked_children[0].id);
        }
      } else {
        throw new Error(data.error || 'Failed to load parent dashboard information.');
      }
    } catch (err: any) {
      console.error('Error fetching parent dashboard:', err);
      setErrorMsg(err.message || 'Unable to connect to school server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [session.id, session.role]);

  // Access Control Guard: Accessible ONLY when the session role is 'parent'
  if (!isParentRole) {
    return (
      <div id="parent-dashboard-restricted" className="p-8 max-w-4xl mx-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-rose-950 p-6 text-white flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Security & Role Enforced Guard
              </span>
              <h2 className="text-xl font-bold">Parent & Guardian Portal Access Restricted</h2>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-900 space-y-2">
              <p className="font-semibold">
                Access Denied: The Parent Dashboard is exclusively accessible to verified Parent/Guardian accounts.
              </p>
              <p className="text-xs text-rose-700">
                Your current authenticated user role is{' '}
                <span className="font-mono font-bold px-1.5 py-0.5 bg-rose-200 rounded text-rose-900">
                  {session.role}
                </span>{' '}
                (Account: {session.name} &lt;{session.email}&gt;).
              </p>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              In accordance with Greenfield Academy privacy governance and student record protections, 
              parental dashboards containing dependent attendance, strand progress summaries, and 
              financial ledgers are segregated from faculty and administrative operations.
            </p>

            <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-3">
              <button
                type="button"
                id="btn-return-overview"
                onClick={() => onNavigateTab && onNavigateTab('overview')}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Return to Standard Overview</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Child
  const currentChild = linkedChildren.find((c) => c.id === selectedChildId) || linkedChildren[0];

  // Filtered attendance records
  const filteredAttendanceLogs = currentChild?.attendance.recent_logs.filter((log) => {
    if (attendanceFilter === 'all') return true;
    return log.status === attendanceFilter;
  }) || [];

  // Filtered academic results
  const filteredResults = currentChild?.academic_progress.recent_results.filter((res) => {
    if (subjectFilter === 'all') return true;
    return res.subject_code === subjectFilter || res.subject_name === subjectFilter;
  }) || [];

  // Unique subjects for filter
  const availableSubjects = Array.from(
    new Set(currentChild?.academic_progress.recent_results.map((r) => r.subject_code) || [])
  );

  return (
    <div id="parent-dashboard-view" className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-sm flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. Header Banner & Guardian Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Parent & Guardian Portal
              </span>
              <span className="text-xs text-indigo-300/80 font-medium">Day 5 Production</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {parentProfile?.full_name ? `Welcome, ${parentProfile.full_name}` : `Welcome, ${session.name}`}
            </h1>

            <p className="text-sm text-indigo-200 max-w-2xl leading-relaxed">
              Review live attendance metrics, continuous assessment scores, CBC strand evaluations, 
              and teacher guidance for your registered dependent scholars.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-indigo-300">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>{parentProfile?.email || session.email}</span>
              </div>
              {parentProfile?.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{parentProfile.phone}</span>
                </div>
              )}
              {parentProfile?.occupation && (
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{parentProfile.occupation}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              id="btn-refresh-parent-data"
              onClick={fetchDashboardData}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-medium border border-white/15 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              title="Refresh live academic data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <button
              type="button"
              id="btn-print-parent-summary"
              onClick={() => {
                window.print();
                showToast('Initiating printer-friendly summary.');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-800">Synchronizing Dependent Scholar Records...</p>
          <p className="text-xs text-slate-500 mt-1">Retrieving verified attendance logs and academic assessments</p>
        </div>
      )}

      {/* Error State */}
      {!loading && errorMsg && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-rose-900">Failed to load Parent Dashboard</h3>
            <p className="text-xs text-rose-700">{errorMsg}</p>
            <button
              type="button"
              onClick={fetchDashboardData}
              className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Empty State: No Linked Children */}
      {!loading && !errorMsg && linkedChildren.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Linked Students Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Your parent account currently has no dependent scholars linked in the registrar records.
              Please contact the Greenfield Academy Administration office to link your student.
            </p>
          </div>
        </div>
      )}

      {/* Main Content when Linked Children exist */}
      {!loading && !errorMsg && linkedChildren.length > 0 && currentChild && (
        <div className="space-y-6">
          {/* 2. Linked Children Switcher Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Registered Dependent Students ({linkedChildren.length})
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Click to switch scholar view</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {linkedChildren.map((child) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <button
                    key={child.id}
                    id={`tab-child-${child.id}`}
                    type="button"
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left border ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={child.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={child.student_name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold leading-tight">{child.student_name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                          {child.relationship}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {child.grade} • {child.student_code}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Selected Child Profile Summary Ribbon */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={currentChild.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={currentChild.student_name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100 shadow-md shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-slate-900">{currentChild.student_name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {currentChild.grade}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {currentChild.section}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Student ID: <strong className="text-slate-800">{currentChild.student_code}</strong></span>
                  <span>Institutional Email: <strong className="text-slate-800">{currentChild.email}</strong></span>
                  <span>Relationship: <strong className="text-slate-800">{currentChild.relationship}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {onNavigateTab && (
                <>
                  <button
                    type="button"
                    id="btn-goto-report-card"
                    onClick={() => {
                      onNavigateTab('reports');
                      showToast(`Opening official academic transcript for ${currentChild.student_name}.`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                    <span>Official Report Card</span>
                  </button>

                  <button
                    type="button"
                    id="btn-goto-fee-statement"
                    onClick={() => {
                      onNavigateTab('finance');
                      showToast(`Navigating to tuition payment statement.`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                    <span>Fee Statement & M-Pesa</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 4. Core Metrics Grid: Attendance & Academic High-Level KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Overall Attendance Rate */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Attendance Rate
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {currentChild.attendance.attendance_rate}%
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  {currentChild.attendance.attendance_rate >= 90 ? 'Outstanding' : 'Regular'}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    currentChild.attendance.attendance_rate >= 90
                      ? 'bg-emerald-500'
                      : currentChild.attendance.attendance_rate >= 75
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${currentChild.attendance.attendance_rate}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {currentChild.attendance.present_days} of {currentChild.attendance.total_days} recorded sessions attended
              </p>
            </div>

            {/* KPI 2: Academic Average & GPA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Academic Average
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {currentChild.academic_progress.overall_average}%
                </span>
                {currentChild.gpa && (
                  <span className="text-xs font-semibold text-indigo-700">
                    GPA {currentChild.gpa}
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${currentChild.academic_progress.overall_average}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Calculated across {currentChild.academic_progress.total_assessments} evaluated continuous assessments
              </p>
            </div>

            {/* KPI 3: CBC Competency Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  CBC Strand Mastery
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold" title="Exceeding Expectations">
                  EE: {currentChild.academic_progress.cbc_breakdown.EE}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold" title="Meeting Expectations">
                  ME: {currentChild.academic_progress.cbc_breakdown.ME}
                </span>
                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold" title="Approaching Expectations">
                  AE: {currentChild.academic_progress.cbc_breakdown.AE}
                </span>
                <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold" title="Below Expectations">
                  BE: {currentChild.academic_progress.cbc_breakdown.BE}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-4">
                National CBC Rubric competency evaluations
              </p>
            </div>

            {/* KPI 4: Financial Status (Bonus Context for Parent) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tuition Account
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {currentChild.fee_account ? `KES ${Number(currentChild.fee_account.balance).toLocaleString()}` : 'KES 0'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentChild.fee_account?.status === 'CLEARED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {currentChild.fee_account?.status || 'Active'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-4">
                {currentChild.fee_account?.status === 'CLEARED'
                  ? 'All tuition obligations cleared for Fall Term'
                  : `Balance remaining due ${currentChild.fee_account?.due_date || 'Term End'}`}
              </p>
            </div>
          </div>

          {/* 5. ATTENDANCE SECTION (Linked Student Attendance Tracker) */}
          <div id="section-attendance-details" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Attendance History & Daily Session Ledger
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Official daily class check-in entries for {currentChild.student_name}
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  id="filter-att-all"
                  onClick={() => setAttendanceFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    attendanceFilter === 'all'
                      ? 'bg-white text-indigo-900 shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  All ({currentChild.attendance.recent_logs.length})
                </button>
                <button
                  type="button"
                  id="filter-att-present"
                  onClick={() => setAttendanceFilter('present')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    attendanceFilter === 'present'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Present ({currentChild.attendance.present_days})
                </button>
                <button
                  type="button"
                  id="filter-att-late"
                  onClick={() => setAttendanceFilter('late')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    attendanceFilter === 'late'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Late ({currentChild.attendance.late_days})
                </button>
                <button
                  type="button"
                  id="filter-att-absent"
                  onClick={() => setAttendanceFilter('absent')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    attendanceFilter === 'absent'
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Absent ({currentChild.attendance.absent_days})
                </button>
              </div>
            </div>

            {/* Attendance Status Summary Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Total School Days</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{currentChild.attendance.total_days}</div>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="text-[11px] font-semibold text-emerald-800 uppercase">Days Present</div>
                <div className="text-xl font-bold text-emerald-900 mt-1">{currentChild.attendance.present_days}</div>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div className="text-[11px] font-semibold text-amber-800 uppercase">Tardy / Late</div>
                <div className="text-xl font-bold text-amber-900 mt-1">{currentChild.attendance.late_days}</div>
              </div>
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                <div className="text-[11px] font-semibold text-rose-800 uppercase">Absences</div>
                <div className="text-xl font-bold text-rose-900 mt-1">{currentChild.attendance.absent_days}</div>
              </div>
            </div>

            {/* Attendance Logs Table */}
            {filteredAttendanceLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                No attendance sessions match the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Class / Session</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Staff / Teacher Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendanceLogs.map((log) => {
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            {new Date(log.date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-indigo-900">{log.class_code || 'General Session'}</span>
                            {log.class_title && (
                              <span className="text-slate-500 ml-1.5 text-[11px] hidden sm:inline">
                                • {log.class_title}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                log.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : log.status === 'late'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {log.status === 'present' && <Check className="w-3 h-3" />}
                              {log.status === 'late' && <Clock className="w-3 h-3" />}
                              {log.status === 'absent' && <AlertCircle className="w-3 h-3" />}
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {log.remarks ? (
                              <span>{log.remarks}</span>
                            ) : (
                              <span className="text-slate-400 italic">No special remark logged</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 6. ACADEMIC PROGRESS SUMMARIES SECTION */}
          <div id="section-academic-progress" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Recent Academic Progress & Continuous Evaluations
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Formative tests, practical tasks, and CBC strand performance summaries
                </p>
              </div>

              {/* Subject filter */}
              {availableSubjects.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-600">Filter Learning Area:</span>
                  <select
                    id="select-subject-filter"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">All Learning Areas</option>
                    {availableSubjects.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Subject Summary Cards */}
            {currentChild.academic_progress.subject_progress.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentChild.academic_progress.subject_progress.map((sub) => (
                  <div key={sub.subject_code} className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          {sub.subject_code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                          {sub.subject_name}
                        </h4>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        sub.proficiency_level === 'EE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sub.proficiency_level === 'ME'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sub.proficiency_level === 'EE'
                          ? 'Exceeding'
                          : sub.proficiency_level === 'ME'
                          ? 'Meeting'
                          : 'Approaching'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Average Performance</span>
                        <span className="font-bold text-slate-900">{sub.average_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${sub.average_percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span>Assessments Logged</span>
                      <strong className="text-slate-700">{sub.assessments_count} tasks</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Continuous Assessments Detailed Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Detailed Assessment Breakdown & Teacher Guidance
              </h4>

              {filteredResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No academic assessments recorded yet for this student.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredResults.map((result) => {
                    const scoreNum = Number(result.percentage || result.raw_score || 0);
                    return (
                      <div
                        key={result.id}
                        className="p-4 sm:p-5 bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-xs rounded-xl transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {result.subject_code}
                              </span>
                              <span className="text-xs font-bold text-indigo-950">
                                {result.subject_name}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs text-slate-500 font-medium">
                                {result.assessment_type.replace('_', ' ')}
                              </span>
                            </div>
                            <h5 className="text-sm font-bold text-slate-900">
                              {result.assessment_title}
                            </h5>
                            {(result.strand_name || result.sub_strand) && (
                              <div className="text-xs text-slate-500 flex items-center gap-2">
                                <span className="font-semibold text-slate-600">Strand:</span>
                                <span>{result.strand_name}</span>
                                {result.sub_strand && (
                                  <>
                                    <span className="text-slate-300">/</span>
                                    <span className="text-slate-600">{result.sub_strand}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 sm:text-right shrink-0">
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center min-w-[70px]">
                              <div className="text-xs text-slate-500 font-medium">Score</div>
                              <div className="text-base font-extrabold text-slate-900 leading-tight">
                                {result.raw_score} / {result.max_score}
                              </div>
                            </div>

                            {result.grade_letter && (
                              <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 text-center min-w-[50px]">
                                <div className="text-[10px] text-indigo-600 font-bold uppercase">Grade</div>
                                <div className="text-base font-extrabold text-indigo-900 leading-tight">
                                  {result.grade_letter}
                                </div>
                              </div>
                            )}

                            {result.cbc_rating && (
                              <div className={`p-2.5 rounded-xl border text-center min-w-[70px] ${
                                result.cbc_rating === 'EE'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : result.cbc_rating === 'ME'
                                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                                  : 'bg-amber-50 border-amber-200 text-amber-900'
                              }`}>
                                <div className="text-[10px] font-bold uppercase tracking-wider">CBC</div>
                                <div className="text-xs font-black">
                                  {result.cbc_rating}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Teacher's Feedback Remarks Callout */}
                        {result.teacher_comment && (
                          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-start gap-2.5">
                            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-bold text-[11px] text-indigo-700 uppercase tracking-wider block">
                                Faculty Instructor Assessment Guidance:
                              </span>
                              <p className="italic text-slate-700 leading-relaxed">
                                &ldquo;{result.teacher_comment}&rdquo;
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
