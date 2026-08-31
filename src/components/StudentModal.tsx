import React from 'react';
import { X, Mail, Phone, Calendar, Award, BookOpen, User, ShieldCheck } from 'lucide-react';
import { Student } from '../types';

interface StudentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentModal: React.FC<StudentModalProps> = ({ student, isOpen, onClose }) => {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
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
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
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

          {/* Contact Details */}
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

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
