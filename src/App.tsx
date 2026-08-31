import React, { useState } from 'react';
import { Header } from './components/Header';
import { WelcomeCard } from './components/WelcomeCard';
import { InfoGrid } from './components/InfoGrid';
import { NavigationTabs } from './components/NavigationTabs';
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

import {
  initialAdminProfile,
  initialStudents,
  initialTeachers,
  initialClasses,
} from './data/mockData';
import { TabType, Student } from './types';
import { CheckCircle2, Info, BellRing } from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState(initialAdminProfile);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [teachers] = useState(initialTeachers);
  const [classes] = useState(initialClasses);
  const [activeTab, setActiveTab] = useState<TabType>('students');

  // Modal States
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleLogout = () => {
    showToast('Session logged out safely. Reloading administrative state...');
    setTimeout(() => {
      setProfile({ ...initialAdminProfile });
    }, 500);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* 1. Header with Brand, Date & Logout */}
      <Header profile={profile} onLogout={handleLogout} />

      {/* 2. Sub-Navigation Bar matching High Density Theme */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        studentsCount={students.length}
        teachersCount={teachers.length}
        classesCount={classes.length}
      />

      {/* Main Content Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* 3. Welcome Card */}
        <WelcomeCard
          profile={profile}
          onAddStudentClick={() => {
            setEditingStudent(null);
            setIsAddModalOpen(true);
          }}
          onExportReportClick={() => {
            setActiveTab('reports');
            showToast('Navigated to Academic Reports dossier.');
          }}
        />

        {/* 4. Administrator & Institution Credentials Info Grid */}
        <InfoGrid profile={profile} />

        {/* 5. High Density Analytics & Recent Requests */}
        <EnrollmentTrendsSection />

        {/* 6. Active Tab Content Section */}
        <section aria-labelledby="active-module-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 id="active-module-heading" className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Management Module • <span className="text-indigo-600 capitalize">{activeTab}</span>
            </h3>
          </div>

          <div>
            {activeTab === 'students' && (
              <StudentsView
                students={students}
                onAddStudent={() => {
                  setEditingStudent(null);
                  setIsAddModalOpen(true);
                }}
                onViewStudent={(student) => setViewingStudent(student)}
                onEditStudent={(student) => {
                  setEditingStudent(student);
                  setIsAddModalOpen(true);
                }}
                onDeleteStudent={handleDeleteStudent}
              />
            )}

            {activeTab === 'teachers' && <TeachersView teachers={teachers} />}
            {activeTab === 'classes' && <ClassesView classes={classes} />}
            {activeTab === 'attendance' && <AttendanceView />}
            {activeTab === 'grading' && <AssessmentGrid />}
            {activeTab === 'finance' && <FeePaymentsView />}
            {activeTab === 'reports' && <ReportsView />}
          </div>
        </section>
      </main>

      {/* Modals & Overlays */}
      <StudentModal
        student={viewingStudent}
        isOpen={!!viewingStudent}
        onClose={() => setViewingStudent(null)}
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

      {/* Modern High-Density Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-8 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center text-white text-[10px] font-bold">
              G
            </div>
            <span className="font-semibold text-slate-800">Greenfield Academy Central District</span>
            <span className="text-slate-400">• Institutional Management Console</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <span>District 042-C</span>
            <span>Security Tier 1</span>
            <span>GA-2024-001</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
