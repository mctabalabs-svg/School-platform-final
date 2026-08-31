import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import { Student } from '../types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Omit<Student, 'id'> | Student) => void;
  initialData?: Student | null;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentId: `STU-2024-${Math.floor(100 + Math.random() * 900)}`,
    grade: 'Grade 10',
    section: 'Section A (STEM)',
    email: '',
    guardianName: '',
    guardianPhone: '+1 (555) 000-0000',
    attendanceRate: 98.0,
    gpa: 3.85,
    status: 'Active' as Student['status'],
    enrolledDate: 'Aug 26, 2026',
    enrolledClasses: ['AP Calculus BC', 'AP Physics 1', 'English Lit 10'],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        studentId: initialData.studentId,
        grade: initialData.grade,
        section: initialData.section,
        email: initialData.email,
        guardianName: initialData.guardianName,
        guardianPhone: initialData.guardianPhone,
        attendanceRate: initialData.attendanceRate,
        gpa: initialData.gpa,
        status: initialData.status,
        enrolledDate: initialData.enrolledDate,
        enrolledClasses: initialData.enrolledClasses || ['AP Calculus BC'],
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        studentId: `STU-2024-${Math.floor(100 + Math.random() * 900)}`,
        grade: 'Grade 10',
        section: 'Section A (STEM)',
        email: '',
        guardianName: '',
        guardianPhone: '+1 (555) 234-5678',
        attendanceRate: 98.0,
        gpa: 3.85,
        status: 'Active',
        enrolledDate: 'Aug 26, 2026',
        enrolledClasses: ['AP Calculus BC', 'AP Physics 1', 'English Lit 10'],
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) return;

    if (initialData) {
      onSave({
        ...initialData,
        ...formData,
      });
    } else {
      onSave({
        ...formData,
        email: formData.email || `${formData.firstName.toLowerCase()[0]}.${formData.lastName.toLowerCase()}@greenfield.edu`,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900">
              {initialData ? 'Edit Student Record' : 'Enroll New Student'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Maya"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Lin"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Student ID & Grade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Student ID
              </label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50 font-mono text-slate-700"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Grade Level
              </label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white"
              >
                <option>Grade 9</option>
                <option>Grade 10</option>
                <option>Grade 11</option>
                <option>Grade 12</option>
              </select>
            </div>
          </div>

          {/* Section & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Academic Section
              </label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="Section A (STEM)"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Enrollment Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>
          </div>

          {/* Guardian & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Guardian Full Name
              </label>
              <input
                type="text"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                placeholder="e.g. Dr. Robert Lin"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Guardian Phone
              </label>
              <input
                type="text"
                value={formData.guardianPhone}
                onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                placeholder="+1 (555) 234-5678"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200"
              />
            </div>
          </div>

          {/* GPA & Attendance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Cumulative GPA (0.0 - 4.0)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={formData.gpa}
                onChange={(e) => setFormData({ ...formData, gpa: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Attendance Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.attendanceRate}
                onChange={(e) => setFormData({ ...formData, attendanceRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{initialData ? 'Update Record' : 'Save & Enroll'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
