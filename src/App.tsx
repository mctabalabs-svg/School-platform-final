import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { LoginModal, UserSession } from './components/LoginModal';
import { DashboardOverview } from './components/DashboardOverview';
import { StudentsView } from './components/StudentsView';
import { StudentModal } from './components/StudentModal';
import { AddStudentModal } from './components/AddStudentModal';
import { TeachersView } from './components/TeachersView';
import { ClassesView } from './components/ClassesView';
import { AttendanceView } from './components/AttendanceView';
import { AssessmentGrid } from './components/AssessmentGrid';
import { FeePaymentsView } from './components/FeePaymentsView';
import { ReportsView } from './components/ReportsView';
import { AuditsView } from './components/AuditsView';
import { ParentStudentLinkingView } from './components/ParentStudentLinkingView';
import { ParentDashboardView } from './components/ParentDashboardView';
import { StudentAssignmentsView } from './components/StudentAssignmentsView';
import { PlatformAdminView } from './components/PlatformAdminView';
import { SchoolWorkspaceView } from './components/SchoolWorkspaceView';

import {
  initialAdminProfile,
  initialStudents,
  initialTeachers,
  initialClasses,
} from './data/mockData';
import { Student } from './types';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [teachers] = useState(initialTeachers);
  const [classes] = useState(initialClasses);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Multi-Role Authenticated Session State (Day 2 JWT Integration)
  const [session, setSession] = useState<UserSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const verifySession = async () => {
      const token = localStorage.getItem('ga_auth_token');
      if (!token) {
        localStorage.removeItem('ga_user_session');
        if (active) setIsSessionLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Your session has expired. Please sign in again.');
        const data = await response.json();
        const user = data.user;
        const restoredSession: UserSession = {
          id: user.id,
          school_id: user.school_id,
          school_name: user.school_name,
          email: user.email,
          name: user.name || `${user.first_name} ${user.last_name}`,
          role: user.role,
          profile_id: user.profile_id ?? null,
          token,
          profile: user.profile,
        };
        if (active) {
          localStorage.setItem('ga_user_session', JSON.stringify(restoredSession));
          setSession(restoredSession);
        }
      } catch {
        localStorage.removeItem('ga_auth_token');
        localStorage.removeItem('ga_user_session');
      } finally {
        if (active) setIsSessionLoading(false);
      }
    };

    void verifySession();
    return () => {
      active = false;
    };
  }, []);

  // Modal States
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentModalDefaultTab, setStudentModalDefaultTab] = useState<'profile' | 'assignments'>('profile');

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Adjust default tab when session role changes
  useEffect(() => {
    if (!session) return;
    if (session.role === 'teacher') {
      setActiveTab('classes');
    } else if (session.role === 'parent') {
      setActiveTab('parent_dashboard');
    } else if (session.role === 'student') {
      setActiveTab('assignments');
    } else {
      setActiveTab('overview');
    }
  }, [session?.role]);

  useEffect(() => {
    if (!session?.token) return;

    const verifyInterval = window.setInterval(async () => {
      try {
        const response = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('ga_auth_token');
          localStorage.removeItem('ga_user_session');
          setSession(null);
        } else if (!response.ok) {
          console.error('Unable to verify the current session:', response.status);
        }
      } catch (error) {
        console.error('Session verification request failed:', error);
      }
    }, 5 * 60 * 1000);

    return () => window.clearInterval(verifyInterval);
  }, [session?.token]);

  const handleLogout = () => {
    localStorage.removeItem('ga_auth_token');
    localStorage.removeItem('ga_user_session');
    setSession(null);
    setIsLoginModalOpen(false);
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    setIsSessionLoading(false);
    showToast(`Welcome back, ${newSession.name} (${newSession.role.toUpperCase()})!`);
  };

  const handleSaveStudent = (studentData: Omit<Student, 'id'> | Student) => {
    if ('id' in studentData) {
      // Edit existing
      setStudents((prev) =>
        prev.map((s) => (s.id === studentData.id ? (studentData as Student) : s))
      );
      showToast(`Student record for ${studentData.firstName} ${studentData.lastName} updated.`);
    } else {
      // Add new
      const newStudent: Student = {
        ...studentData,
        id: `s-${Date.now()}`,
      };
      setStudents((prev) => [newStudent, ...prev]);
      showToast(`New student ${newStudent.firstName} ${newStudent.lastName} enrolled successfully!`);
    }
  };

  const handleDeleteStudent = (id: string) => {
    const target = students.find((s) => s.id === id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
    showToast(`Removed student record (${target?.firstName || 'Student'}).`);
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-sm text-slate-300">
        Verifying your session…
      </div>
    );
  }

  if (!session) {
    return (
      <LoginModal
        isOpen
        canClose={false}
        onClose={() => undefined}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (session.role === 'platform_admin') {
    return <PlatformAdminView session={session} onLogout={handleLogout} />;
  }

  if (session.school_id !== 'SCH-KEN-2026-001') {
    return <SchoolWorkspaceView session={session} onLogout={handleLogout} />;
  }

  return (
    <DashboardLayout
      session={session}
      activeNavId={activeTab}
      onSelectNav={(tabId) => setActiveTab(tabId)}
      onLogout={handleLogout}
      onOpenLoginModal={() => setIsLoginModalOpen(true)}
    >
      {/* 1. District / School Overview View */}
      {activeTab === 'overview' && (
        <DashboardOverview
          name={session.name}
          school={session.school_name || initialAdminProfile.school}
          students={students}
          teachers={teachers}
          classes={classes}
          onAddStudent={() => {
              setEditingStudent(null);
              setIsAddModalOpen(true);
          }}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      )}

      {/* 2. Parent Dashboard View (Day 5 MVP) - Accessible only when session role is 'parent' */}
      {activeTab === 'parent_dashboard' && (
        <ParentDashboardView
          session={session}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
          }}
        />
      )}

      {/* 2. Parent-Student Linking & Guardian Registry (Day 5 MVP) */}
      {activeTab === 'parents' && (
        <div className="space-y-4">
          <ParentStudentLinkingView />
        </div>
      )}

      {/* 3. Students Registry / Linked Children View */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {session.role === 'parent' ? 'Registered Dependent Children' : 'Student Registry & Roster'}
            </h3>
          </div>
          <StudentsView
            students={
              session.role === 'parent'
                ? students.filter((s) => s.id === 's-1' || s.id === 's-2')
                : students
            }
            onAddStudent={() => {
              setEditingStudent(null);
              setIsAddModalOpen(true);
            }}
            onViewStudent={(student) => {
              setViewingStudent(student);
              setStudentModalDefaultTab('profile');
            }}
            onOpenAssignments={(student) => {
              setViewingStudent(student);
              setStudentModalDefaultTab('assignments');
            }}
            onEditStudent={(student) => {
              setEditingStudent(student);
              setIsAddModalOpen(true);
            }}
            onDeleteStudent={handleDeleteStudent}
          />
        </div>
      )}

      {/* 3. Teachers / Faculty Directory View */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Faculty Directory & Departmental Leads
          </h3>
          <TeachersView teachers={teachers} />
        </div>
      )}

      {/* 4. Manage Classes / Timetable View */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {session.role === 'student' ? 'Course Schedule & Classrooms' : 'Academic Class Roster & Schedules'}
          </h3>
          <ClassesView classes={classes} />
        </div>
      )}

      {/* 5. Attendance & Truancy View */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Attendance Register & Truancy Audit
          </h3>
          <AttendanceView />
        </div>
      )}

      {/* 6. Competency & Strands Grading View */}
      {activeTab === 'grading' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Continuous Assessments & CBC Strand Rubrics
          </h3>
          <AssessmentGrid />
        </div>
      )}

      {/* 7. Fee Clearance & M-Pesa Payments View */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Safaricom M-Pesa Fee Settlement & Clearance Ledger
          </h3>
          <FeePaymentsView />
        </div>
      )}

      {/* 8. Summative Report Cards & Broadsheet Dossier */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Official Summative Transcripts & CBC Broadsheets
          </h3>
          <ReportsView />
        </div>
      )}

      {/* 9. Immutable System Security & Audits View */}
      {activeTab === 'audits' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            District Security Audits & Access Logs
          </h3>
          <AuditsView />
        </div>
      )}

      {/* 10. Student Assignments & Submission Portal (Day 5 MVP) */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <StudentAssignmentsView session={session} />
        </div>
      )}

      {/* Modals & Overlays */}
      <StudentModal
        student={viewingStudent}
        isOpen={!!viewingStudent}
        onClose={() => setViewingStudent(null)}
        defaultTab={studentModalDefaultTab}
      />

      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingStudent(null);
        }}
        onSave={handleSaveStudent}
        initialData={editingStudent}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Toast Notification Container */}
      {toastMessage && (
        <div
          id="system-toast-notification"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-xl shadow-2xl border border-slate-700/80 flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </DashboardLayout>
  );
}
