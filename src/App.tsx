import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { LoginModal, UserSession } from './components/LoginModal';
import { WelcomeCard } from './components/WelcomeCard';
import { InfoGrid } from './components/InfoGrid';
import { EnrollmentTrendsSection } from './components/EnrollmentTrendsSection';
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
  const [session, setSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('ga_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      id: 'usr-admin-01',
      school_id: 'SCH-KEN-2026-001',
      email: 'admin@greenfield.edu',
      name: 'Arthur Pendelton',
      role: 'admin',
      profile_id: 'usr-admin-01',
    };
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
    if (session.role === 'teacher') {
      setActiveTab('classes');
    } else if (session.role === 'parent') {
      setActiveTab('parent_dashboard');
    } else if (session.role === 'student') {
      setActiveTab('assignments');
    } else {
      setActiveTab('overview');
    }
  }, [session.role]);

  const handleLogout = () => {
    localStorage.removeItem('ga_auth_token');
    localStorage.removeItem('ga_user_session');
    const guestAdmin: UserSession = {
      id: 'usr-admin-01',
      school_id: 'SCH-KEN-2026-001',
      email: 'admin@greenfield.edu',
      name: 'Arthur Pendelton (Admin)',
      role: 'admin',
      profile_id: 'usr-admin-01',
    };
    setSession(guestAdmin);
    showToast('Session tokens cleared. Logged out successfully.');
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
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
        <div className="space-y-6">
          <WelcomeCard
            profile={{
              ...initialAdminProfile,
              name: session.name,
              role: session.role === 'admin' ? 'District Administrator' : session.role,
              email: session.email,
            }}
            onAddStudentClick={() => {
              setEditingStudent(null);
              setIsAddModalOpen(true);
            }}
            onExportReportClick={() => {
              setActiveTab('reports');
              showToast('Navigated to Academic Reports dossier.');
            }}
          />

          <InfoGrid
            metrics={{
              students: students.length,
              classes: classes.length,
              teachers: teachers.length,
              attendance: students.length
                ? students.reduce((total, student) => total + student.attendanceRate, 0) / students.length
                : 0,
            }}
          />

          <EnrollmentTrendsSection />
        </div>
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
