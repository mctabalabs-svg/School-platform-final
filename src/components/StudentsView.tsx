import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  GraduationCap,
  Sparkles,
  ArrowUpDown,
  LayoutGrid,
  List,
  UploadCloud,
} from 'lucide-react';
import { Student } from '../types';

interface StudentsViewProps {
  students: Student[];
  onAddStudent: () => void;
  onViewStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onOpenAssignments?: (student: Student) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onAddStudent,
  onViewStudent,
  onEditStudent,
  onDeleteStudent,
  onOpenAssignments,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'gpa' | 'attendance'>('name');

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchesSearch =
          s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesGrade = gradeFilter === 'All' || s.grade === gradeFilter;
        const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

        return matchesSearch && matchesGrade && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.lastName.localeCompare(b.lastName);
        } else if (sortBy === 'gpa') {
          return b.gpa - a.gpa;
        } else {
          return b.attendanceRate - a.attendanceRate;
        }
      });
  }, [students, searchTerm, gradeFilter, statusFilter, sortBy]);

  return (
    <div id="students-management-panel" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header & Controls Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h4 className="text-base sm:text-lg font-bold text-slate-800">
                Student Directory & Academic Records
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                {filteredStudents.length} of {students.length} Students
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review enrolled students, attendance averages, academic standings, and guardian info.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              id="add-student-primary-btn"
              type="button"
              onClick={onAddStudent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll Student</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 mt-4 pt-4 border-t border-slate-100">
          {/* Search Input */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="student-search-input"
              type="text"
              placeholder="Search by student name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Grade Filter */}
          <div className="lg:col-span-3">
            <select
              id="grade-filter-select"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              aria-label="Filter by Grade"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="All">All Grades (9–12)</option>
              <option value="Grade 9">Grade 9 (Freshman)</option>
              <option value="Grade 10">Grade 10 (Sophomore)</option>
              <option value="Grade 11">Grade 11 (Junior)</option>
              <option value="Grade 12">Grade 12 (Senior)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              id="status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Graduated">Graduated</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="lg:col-span-2">
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort students"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="gpa">Sort: Highest GPA</option>
              <option value="attendance">Sort: Attendance %</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Content: Table or Grid */}
      {filteredStudents.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h5 className="text-sm font-bold text-slate-800">No students match your filter criteria</h5>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try resetting your search query or adjusting the grade/status filters to find student records.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setGradeFilter('All');
              setStatusFilter('All');
            }}
            className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table id="students-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <th className="py-3 px-4 sm:px-6">Student</th>
                <th className="py-3 px-4">Grade & Section</th>
                <th className="py-3 px-4">Guardian Contact</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">GPA</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredStudents.map((student) => {
                const statusColors = {
                  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  'On Leave': 'bg-amber-50 text-amber-700 border-amber-200',
                  Graduated: 'bg-blue-50 text-blue-700 border-blue-200',
                  Pending: 'bg-slate-100 text-slate-700 border-slate-200',
                };

                return (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Student Info */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        {student.avatarUrl ? (
                          <img
                            src={student.avatarUrl}
                            alt={`${student.firstName} ${student.lastName}`}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            {student.firstName[0]}
                            {student.lastName[0]}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {student.studentId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Grade & Section */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{student.grade}</span>
                      <div className="text-[11px] text-slate-500">{student.section}</div>
                    </td>

                    {/* Guardian Contact */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{student.guardianName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {student.guardianPhone}
                      </div>
                    </td>

                    {/* Attendance */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              student.attendanceRate >= 95
                                ? 'bg-indigo-600'
                                : student.attendanceRate >= 90
                                ? 'bg-indigo-400'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${student.attendanceRate}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-800 text-xs">
                          {student.attendanceRate}%
                        </span>
                      </div>
                    </td>

                    {/* GPA */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 px-2 py-0.5 rounded-md bg-slate-100 font-mono text-xs">
                        {student.gpa.toFixed(2)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          statusColors[student.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => (onOpenAssignments ? onOpenAssignments(student) : onViewStudent(student))}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Submit / View Assignments"
                        >
                          <UploadCloud className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewStudent(student)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditStudent(student)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteStudent(student.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid Mode */
        <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {student.avatarUrl ? (
                      <img
                        src={student.avatarUrl}
                        alt={`${student.firstName} ${student.lastName}`}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                        {student.firstName[0]}
                        {student.lastName[0]}
                      </div>
                    )}
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">
                        {student.firstName} {student.lastName}
                      </h5>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {student.studentId}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      student.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {student.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Grade & Track:</span>
                    <span className="font-medium text-slate-800">
                      {student.grade} • {student.section}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Attendance:</span>
                    <span className="font-semibold text-indigo-600">
                      {student.attendanceRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Academic Standing:</span>
                    <span className="font-bold text-slate-900">{student.gpa.toFixed(2)} GPA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Guardian:</span>
                    <span className="text-slate-700">{student.guardianName}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onViewStudent(student)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Record
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => (onOpenAssignments ? onOpenAssignments(student) : onViewStudent(student))}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md cursor-pointer"
                    title="Submit / View Assignments"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditStudent(student)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteStudent(student.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-md cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table Footer / Summary Bar */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          Showing <strong className="text-slate-700">{filteredStudents.length}</strong> registered records in current session
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            Avg Attendance: <strong className="text-slate-700">95.2%</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            Avg GPA: <strong className="text-slate-700">3.80</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
