import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  Calendar,
  Award,
  BookOpen,
  User,
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Student, StudentAssignmentItem } from '../types';
import { AssignmentSubmissionModal } from './AssignmentSubmissionModal';

interface StudentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'profile' | 'assignments';
}

export const StudentModal: React.FC<StudentModalProps> = ({
  student,
  isOpen,
  onClose,
  defaultTab = 'profile',
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'assignments'>(defaultTab);
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignmentItem | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, student]);

  const loadAssignments = async () => {
    if (!student) return;
    setLoadingAssignments(true);
    try {
      const token = localStorage.getItem('ga_auth_token');
      let res = await fetch(`/api/students/${student.id}/assignments`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok && student.id !== 's-1') {
        res = await fetch(`/api/students/s-1/assignments`, {
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'admin',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      }

      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error('Failed to load assignments for student:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (student && isOpen) {
      loadAssignments();
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="relative bg-slate-900 p-6 text-white">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">
              {student.avatarUrl ? (
                <img
                  src={student.avatarUrl}
                  alt={student.firstName}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-400"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center ring-2 ring-indigo-400">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">
                    {student.firstName} {student.lastName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                    {student.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Student ID: {student.studentId}
                </p>
                <p className="text-xs text-indigo-300 font-medium mt-1">
                  {student.grade} • {student.section}
                </p>
              </div>
            </div>

            {/* Tab Bar inside Header */}
            <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Profile & Demographics
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('assignments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'assignments'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Assignments & Submissions</span>
                {assignments.filter((a) => a.status === 'pending').length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full">
                    {assignments.filter((a) => a.status === 'pending').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Profile Tab Content */}
          {activeTab === 'profile' && (
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">GPA Score</span>
                  <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                    {student.gpa.toFixed(2)}{' '}
                    <span className="text-xs text-indigo-600 font-normal">/ 4.00</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Attendance Rate</span>
                  <div className="text-xl font-bold text-indigo-600 font-mono mt-0.5">
                    {student.attendanceRate}%
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Student Email</span>
                    <span className="font-medium text-slate-800">{student.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Primary Guardian</span>
                    <span className="font-medium text-slate-800">{student.guardianName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Guardian Phone Number</span>
                    <span className="font-medium text-slate-800">{student.guardianPhone}</span>
                  </div>
                </div>
              </div>

              {/* Enrolled Classes Pills */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Registered Course Sections
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {student.enrolledClasses.map((cls) => (
                    <span
                      key={cls}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                    >
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Assignments Tab Content */}
          {activeTab === 'assignments' && (
            <div className="p-6 space-y-3.5 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Course Assignments & Homework
                </span>
                <button
                  type="button"
                  onClick={loadAssignments}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingAssignments ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {loadingAssignments ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading student assignments...
                </div>
              ) : assignments.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No assignments registered for this student's courses.
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((asm) => {
                    const isSubmitted = asm.status === 'submitted';
                    const isGraded = asm.status === 'graded';
                    return (
                      <div
                        key={asm.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                {asm.subject_code}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {asm.class_code}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900">{asm.title}</h4>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {asm.instructions}
                            </p>
                          </div>

                          {/* Status Badge */}
                          {isGraded ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Graded ({asm.result?.raw_score} pts)
                            </span>
                          ) : isSubmitted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 shrink-0 flex items-center gap-1">
                              <UploadCloud className="w-3 h-3" /> Submitted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Due {asm.due_date}
                            </span>
                          )}
                        </div>

                        {/* Submission details snippet */}
                        {asm.submission?.file_name && (
                          <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="font-semibold truncate">{asm.submission.file_name}</span>
                            <span className="text-slate-400 text-[10px]">({asm.submission.file_size})</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                          <span className="text-slate-400">
                            Max: {asm.max_score} pts • Due: {asm.due_date}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAssignment(asm);
                              setIsSubmissionModalOpen(true);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                          >
                            <UploadCloud className="w-3 h-3" />
                            {isGraded ? 'View / Resubmit' : isSubmitted ? 'Edit Submission' : 'Submit Assignment'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            {activeTab === 'profile' ? (
              <button
                type="button"
                onClick={() => setActiveTab('assignments')}
                className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>View & Submit Assignments</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Back to Profile
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Submission Modal */}
      {selectedAssignment && (
        <AssignmentSubmissionModal
          assignment={selectedAssignment}
          studentId={student.id}
          studentName={`${student.firstName} ${student.lastName}`}
          isOpen={isSubmissionModalOpen}
          onClose={() => {
            setIsSubmissionModalOpen(false);
            setSelectedAssignment(null);
          }}
          onSubmitted={() => {
            loadAssignments();
          }}
        />
      )}
    </>
  );
};
