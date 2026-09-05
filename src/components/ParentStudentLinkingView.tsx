import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Link2,
  UserCheck,
  UserPlus,
  Users,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  School,
  GraduationCap,
  Sparkles,
  ChevronDown,
  Phone,
  Mail,
  ShieldCheck,
  Info,
  IdCard,
  Briefcase,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ParentRegistrationModal, ParentAccount } from './ParentRegistrationModal';

interface StudentItem {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string;
  section: string;
  email?: string;
  avatarUrl?: string;
  guardianName?: string;
}

export function ParentStudentLinkingView() {
  // State for parents list & selected target parent
  const [parents, setParents] = useState<ParentAccount[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [parentSearchQuery, setParentSearchQuery] = useState<string>('');

  // State for students & filtering
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [relationshipType, setRelationshipType] = useState<string>('Parent/Guardian');

  // Loading & notification states
  const [isLoadingParents, setIsLoadingParents] = useState<boolean>(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(true);
  const [isSavingLinks, setIsSavingLinks] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isRegModalOpen, setIsRegModalOpen] = useState<boolean>(false);

  // 1. Fetch Parents List from backend GET /api/admin/parents
  const fetchParents = async () => {
    setIsLoadingParents(true);
    try {
      let token = localStorage.getItem('ga_auth_token');
      if (!token) {
        const tokenRes = await axios.post('/api/auth/demo-token', { role: 'admin' });
        token = tokenRes.data.token;
        if (token) localStorage.setItem('ga_auth_token', token);
      }

      const response = await axios.get('/api/admin/parents', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success && Array.isArray(response.data.parents)) {
        setParents(response.data.parents);
        // Default select first parent if none selected
        if (!selectedParentId && response.data.parents.length > 0) {
          const first = response.data.parents[0];
          setSelectedParentId(first.parent_id || first.user_id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching parents:', err);
    } finally {
      setIsLoadingParents(false);
    }
  };

  // 2. Fetch Seeded Students Roster
  const fetchStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const response = await axios.get('/api/students');
      if (Array.isArray(response.data)) {
        setStudents(
          response.data.map((s: any) => ({
            id: s.id,
            studentId: s.student_id || s.studentId || 'STU-000',
            firstName: s.first_name || s.firstName || 'Student',
            lastName: s.last_name || s.lastName || '',
            grade: s.grade || 'Grade 10',
            section: s.section || 'General',
            email: s.email || '',
            avatarUrl: s.avatar_url || s.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            guardianName: s.guardian_name || s.guardianName,
          }))
        );
      }
    } catch (err: any) {
      console.error('Error fetching students:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, []);

  // When selected parent changes, populate their already linked students
  const activeParent = parents.find(
    (p) => p.parent_id === selectedParentId || p.user_id === selectedParentId
  );

  useEffect(() => {
    if (activeParent && activeParent.linked_children) {
      const linkedIds = activeParent.linked_children.map((c: any) => c.student_id);
      setSelectedStudentIds(linkedIds);
    } else {
      setSelectedStudentIds([]);
    }
  }, [selectedParentId, parents]);

  // Extract unique classes for filter pills
  const availableClasses = Array.from(new Set(students.map((s) => s.grade))).sort();

  // Filtered students list
  const filteredStudents = students.filter((s) => {
    const matchesClass = classFilter === 'ALL' || s.grade === classFilter;
    const q = studentSearchQuery.toLowerCase().trim();
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchesSearch =
      !q ||
      fullName.includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.grade.toLowerCase().includes(q) ||
      s.section.toLowerCase().includes(q);
    return matchesClass && matchesSearch;
  });

  // Toggle single student selection
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  // Select all filtered students
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map((s) => s.id);
    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  // Deselect all filtered students
  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredStudents.map((s) => s.id));
    setSelectedStudentIds((prev) => prev.filter((id) => !filteredIds.has(id)));
  };

  // Save Relationship Links via POST /api/admin/parents/link-students
  const handleSaveRelationshipLinks = async () => {
    if (!selectedParentId) {
      setStatusMessage({
        type: 'error',
        text: 'Please choose a target Parent account before linking.',
      });
      return;
    }

    if (selectedStudentIds.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Please select at least one student to link with this parent account.',
      });
      return;
    }

    setIsSavingLinks(true);
    setStatusMessage(null);

    try {
      let token = localStorage.getItem('ga_auth_token');
      if (!token) {
        const tokenRes = await axios.post('/api/auth/demo-token', { role: 'admin' });
        token = tokenRes.data.token;
        if (token) localStorage.setItem('ga_auth_token', token);
      }

      const payload = {
        parent_id: selectedParentId,
        student_ids: selectedStudentIds,
        relationship: relationshipType,
      };

      const response = await axios.post('/api/admin/parents/link-students', payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data?.success) {
        setStatusMessage({
          type: 'success',
          text: response.data.message || `Successfully linked ${selectedStudentIds.length} students to parent.`,
        });

        // Refresh parents list to update relationship badges
        await fetchParents();
      } else {
        throw new Error(response.data?.error || 'Failed to link relationships.');
      }
    } catch (err: any) {
      console.error('Error saving relationship links:', err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        'An error occurred while saving relationships.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSavingLinks(false);
    }
  };

  // Unlink a student
  const handleUnlinkStudent = async (studentId: string) => {
    if (!selectedParentId) return;

    try {
      let token = localStorage.getItem('ga_auth_token');
      if (!token) {
        const tokenRes = await axios.post('/api/auth/demo-token', { role: 'admin' });
        token = tokenRes.data.token;
        if (token) localStorage.setItem('ga_auth_token', token);
      }

      const response = await axios.delete('/api/admin/parents/unlink-student', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        data: {
          parent_id: selectedParentId,
          student_id: studentId,
        },
      });

      if (response.data?.success) {
        setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
        setStatusMessage({
          type: 'success',
          text: 'Student unlinked successfully.',
        });
        await fetchParents();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to unlink student.',
      });
    }
  };

  // Newly created parent handler
  const handleParentCreated = (newParent: ParentAccount) => {
    setParents((prev) => [newParent, ...prev]);
    setSelectedParentId(newParent.parent_id || newParent.user_id);
    setStatusMessage({
      type: 'success',
      text: `Parent account for ${newParent.full_name} created. You can now link students below!`,
    });
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER BANNER & ACTIONS                                                */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Parent & Student Relationship Manager
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                  Day 5 Module
                </span>
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl">
            Link parent and guardian accounts to multiple students to enable authorized fee clearance, grade access, and real-time attendance notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchParents();
              fetchStudents();
            }}
            disabled={isLoadingParents || isLoadingStudents}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingParents || isLoadingStudents ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <button
            id="register-parent-btn"
            onClick={() => setIsRegModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <span>Register New Parent</span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TWO-COLUMN INTERFACE: PARENT SELECTOR + MULTI-SELECT STUDENTS          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: TARGET PARENT SELECTION & METADATA (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Select Target Parent
                </h3>
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                {parents.length} Registered
              </span>
            </div>

            {/* Parent Dropdown Selection */}
            <div>
              <label
                htmlFor="target-parent-dropdown"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Choose Parent Account:
              </label>
              <div className="relative">
                <select
                  id="target-parent-dropdown"
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    -- Select a Parent Account --
                  </option>
                  {parents.map((p) => (
                    <option key={p.user_id} value={p.parent_id || p.user_id}>
                      {p.full_name} ({p.email}) — {p.children_count || 0} Children
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Relationship Role Selector */}
            <div>
              <label
                htmlFor="relationship-role-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Relationship Type:
              </label>
              <select
                id="relationship-role-select"
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Parent/Guardian">Parent / Legal Guardian</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Sponsor">Education Sponsor</option>
                <option value="Sibling/Relative">Immediate Relative</option>
              </select>
            </div>

            {/* Active Parent Profile Dossier Card */}
            {activeParent ? (
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-white space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {activeParent.full_name}
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-400/30">
                        {activeParent.occupation || 'Guardian'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      ID: {activeParent.parent_id || activeParent.user_id}
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 text-xs font-bold">
                    {activeParent.first_name[0]}
                    {activeParent.last_name ? activeParent.last_name[0] : ''}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{activeParent.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{activeParent.phone || 'No phone recorded'}</span>
                  </div>
                  {activeParent.national_id && (
                    <div className="flex items-center gap-2">
                      <IdCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Govt ID: {activeParent.national_id}</span>
                    </div>
                  )}
                </div>

                {/* Currently Linked Students Badges */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Assigned Dependent Scholars:</span>
                    <span className="text-indigo-400 font-semibold">
                      {activeParent.linked_children?.length || 0} Linked
                    </span>
                  </div>

                  {activeParent.linked_children && activeParent.linked_children.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activeParent.linked_children.map((child: any) => (
                        <div
                          key={child.student_id}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-200 flex items-center gap-1.5"
                        >
                          <GraduationCap className="w-3 h-3 text-indigo-400" />
                          <span>{child.student_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({child.grade})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnlinkStudent(child.student_id)}
                            title="Unlink student"
                            className="ml-1 text-slate-500 hover:text-rose-400 p-0.5 rounded"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-300/90 italic flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      No students currently linked. Select students from the roster to link.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="font-semibold">No Parent Account Selected</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select a parent from the dropdown or register a new guardian above.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MULTI-SELECT SEARCHABLE STUDENTS ROSTER (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Select Students to Link
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  id="select-all-filtered-btn"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Select All ({filteredStudents.length})
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  id="clear-selection-btn"
                  onClick={handleDeselectAllFiltered}
                  className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Search & Class Filter Utility Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Search students by name, ID, or section..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {/* Class Filter Dropdown */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ALL">All Grades / Classes</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students Multi-Select Roster Box */}
            <div className="border border-slate-200 rounded-xl max-h-[380px] overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <p className="font-semibold">No students match your filter criteria.</p>
                  <p className="text-[11px] mt-1">Try clearing search filters or changing the class.</p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  const isAlreadyLinked = activeParent?.linked_children?.some(
                    (c: any) => c.student_id === student.id
                  );

                  return (
                    <div
                      key={student.id}
                      onClick={() => handleToggleStudent(student.id)}
                      className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/90 border-l-4 border-indigo-600'
                          : 'hover:bg-white bg-white/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-indigo-600 focus:outline-hidden"
                          aria-label={isSelected ? 'Deselect student' : 'Select student'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                          )}
                        </button>

                        <img
                          src={student.avatarUrl}
                          alt={`${student.firstName} ${student.lastName}`}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />

                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>
                              {student.firstName} {student.lastName}
                            </span>
                            {isAlreadyLinked && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Currently Linked
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                            <span>{student.studentId}</span>
                            <span>•</span>
                            <span>{student.grade}</span>
                            <span>•</span>
                            <span className="text-slate-400 truncate max-w-[120px]">
                              {student.section}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Click to Link'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* PROMINENT ACTION BUTTON: SAVE RELATIONSHIP LINKS */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-indigo-700">{selectedStudentIds.length}</span>{' '}
                student(s) selected for{' '}
                <span className="font-semibold text-slate-800">
                  {activeParent?.full_name || 'selected parent'}
                </span>
                .
              </div>

              <button
                type="button"
                id="save-relationship-links-btn"
                onClick={handleSaveRelationshipLinks}
                disabled={isSavingLinks || !selectedParentId}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingLinks ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save Relationship Links ({selectedStudentIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ACTIVE ALL-PARENTS RELATIONSHIPS OVERVIEW MATRIX                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Active Parent-Student Relationship Registry
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {parents.reduce((acc, p) => acc + (p.children_count || 0), 0)} Total Links
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Guardian / Parent</th>
                <th className="px-5 py-3.5">Contact Email</th>
                <th className="px-5 py-3.5">Phone / M-Pesa</th>
                <th className="px-5 py-3.5">Assigned Scholars</th>
                <th className="px-5 py-3.5 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parents.map((parent) => (
                <tr key={parent.user_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                        {parent.first_name[0]}
                      </div>
                      <div>
                        <div>{parent.full_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {parent.occupation || 'Guardian'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                    {parent.email}
                  </td>

                  <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                    {parent.phone || '—'}
                  </td>

                  <td className="px-5 py-3.5">
                    {parent.linked_children && parent.linked_children.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {parent.linked_children.map((c: any) => (
                          <span
                            key={c.student_id}
                            className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-medium"
                          >
                            {c.student_name} ({c.grade})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">No students linked</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedParentId(parent.parent_id || parent.user_id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      Manage Links
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parent Registration Modal */}
      <ParentRegistrationModal
        isOpen={isRegModalOpen}
        onClose={() => setIsRegModalOpen(false)}
        onSuccess={handleParentCreated}
      />
    </div>
  );
}
