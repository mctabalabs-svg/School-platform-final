import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  CheckCheck,
  AlertCircle,
  FileCheck2,
  Search,
  Filter,
  History,
  Layers,
} from 'lucide-react';

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface StudentRosterItem {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  grade: string;
  section: string;
  email: string;
  avatar_url?: string;
  gpa?: number;
}

export interface ClassOption {
  id: string;
  code: string;
  title: string;
  grade: string;
  instructor: string;
  room: string;
  schedule: string;
  capacity?: number;
  enrolled_count?: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  class_id?: string;
  term_id?: string;
  date?: string;
  actor: string;
  details: {
    event?: string;
    total_roster_size?: number;
    breakdown?: {
      present: number;
      absent: number;
      late: number;
    };
    affected_student_ids?: string[];
  };
  created_at: string;
}

export const BulkAttendance: React.FC = () => {
  // 1. Selector States
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('c-1');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Current date formatted as YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [activeTermId] = useState<string>('term-fall-2025');

  // 2. Roster & Attendance Map
  // student_id -> status ('present' | 'absent' | 'late')
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});
  const [remarksState, setRemarksState] = useState<Record<string, string>>({});

  // 3. UI, Search & Loading States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | AttendanceStatus>('all');
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{
    txId: string;
    count: number;
    breakdown: { present: number; absent: number; late: number };
    timestamp: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 4. Audit Trail Drawer / Table
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Fetch classes on mount
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch('/api/classes');
        const data = await res.json();
        if (data.success && data.classes?.length > 0) {
          setClasses(data.classes);
          if (!selectedClassId) {
            setSelectedClassId(data.classes[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    }
    loadClasses();
  }, []);

  // Fetch Roster & Existing Attendance when selectedClassId or selectedDate changes
  const fetchRosterAndAttendance = useCallback(async () => {
    if (!selectedClassId) return;

    setIsLoadingRoster(true);
    setErrorMessage(null);

    try {
      // 1. Fetch Students in class
      const rosterRes = await fetch(`/api/classes/${selectedClassId}/students`);
      const rosterData = await rosterRes.json();
      const studentsList: StudentRosterItem[] = rosterData.students || [];
      setRoster(studentsList);

      // 2. Optimization Requirement: Initialize every row default to 'present' immediately
      const initialMap: Record<string, AttendanceStatus> = {};
      const initialRemarks: Record<string, string> = {};
      studentsList.forEach((s) => {
        initialMap[s.student_id] = 'present';
      });

      // 3. Fetch any existing saved records for this class and date
      if (selectedDate) {
        const attRes = await fetch(`/api/attendance?class_id=${selectedClassId}&date=${selectedDate}`);
        const attData = await attRes.json();
        if (attData.success && Array.isArray(attData.records) && attData.records.length > 0) {
          attData.records.forEach((rec: any) => {
            if (rec.student_id) {
              initialMap[rec.student_id] = rec.status as AttendanceStatus;
              if (rec.remarks) {
                initialRemarks[rec.student_id] = rec.remarks;
              }
            }
          });
        }
      }

      setAttendanceState(initialMap);
      setRemarksState(initialRemarks);
    } catch (err: any) {
      console.error('Error fetching roster/attendance:', err);
      setErrorMessage('Could not load student roster. Please verify connection.');
    } finally {
      setIsLoadingRoster(false);
    }
  }, [selectedClassId, selectedDate]);

  useEffect(() => {
    fetchRosterAndAttendance();
  }, [fetchRosterAndAttendance]);

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/attendance/audit-logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (showAuditLogs) {
      fetchAuditLogs();
    }
  }, [showAuditLogs]);

  // Quick 1-Click Status Toggling
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Batch fast-actions (Under 15 second workflow)
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    roster.forEach((s) => {
      updated[s.student_id] = status;
    });
    setAttendanceState(updated);
  };

  // Metrics breakdown
  const stats = useMemo(() => {
    const total = roster.length;
    let present = 0;
    let absent = 0;
    let late = 0;

    roster.forEach((s) => {
      const st = attendanceState[s.student_id] || 'present';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
    });

    const rate = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 100;

    return { total, present, absent, late, rate };
  }, [roster, attendanceState]);

  // Filtered Roster for search/filter UI
  const filteredRoster = useMemo(() => {
    return roster.filter((s) => {
      const matchesSearch =
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());

      const currentStatus = attendanceState[s.student_id] || 'present';
      const matchesStatus = filterStatus === 'all' || currentStatus === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [roster, searchTerm, filterStatus, attendanceState]);

  // Submit Roster to Backend API
  const handleSubmitRoster = async () => {
    if (!selectedClassId || !selectedDate || roster.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSubmitSuccess(null);

    // Build payload according to specification:
    // { class_id: string, term_id: string, date: string, records: Array<{ student_id: string, status: 'present' | 'absent' | 'late' }> }
    const payload = {
      class_id: selectedClassId,
      term_id: activeTermId,
      date: selectedDate,
      actor: 'Faculty Instructor (Automated Teacher Console)',
      records: roster.map((s) => ({
        student_id: s.student_id,
        status: attendanceState[s.student_id] || 'present',
        remarks: remarksState[s.student_id] || '',
      })),
    };

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit bulk attendance.');
      }

      setSubmitSuccess({
        txId: data.data?.audit_log_id || `tx_${Date.now()}`,
        count: data.data?.records_upserted || roster.length,
        breakdown: data.data?.breakdown || {
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
        },
        timestamp: new Date().toLocaleTimeString(),
      });

      // Refresh audit logs if drawer is open
      if (showAuditLogs) {
        fetchAuditLogs();
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentClassInfo = classes.find((c) => c.id === selectedClassId);

  return (
    <div id="bulk-attendance-container" className="space-y-6">
      {/* 1. Header & Quick Controls Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                Day 6 • Sprint Feature
              </span>
              <span className="text-xs text-slate-400">Atomic Knex Transaction (UPSERT onConflict)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Bulk Classroom Attendance Marker
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Select class and date. All students default to <strong>Present</strong>. Mark exceptions in under 15 seconds, and submit the atomic transaction to the backend.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 self-start lg:self-auto">
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl">
              <div className="text-center">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Roster</span>
                <span className="text-base font-bold text-slate-800">{stats.total}</span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="text-center">
                <span className="block text-[10px] font-bold uppercase text-emerald-600">Present</span>
                <span className="text-base font-bold text-emerald-700">{stats.present}</span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="text-center">
                <span className="block text-[10px] font-bold uppercase text-rose-600">Absent</span>
                <span className="text-base font-bold text-rose-700">{stats.absent}</span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="text-center">
                <span className="block text-[10px] font-bold uppercase text-amber-600">Late</span>
                <span className="text-base font-bold text-amber-700">{stats.late}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Selection Form: Class Dropdown + Date Input + Quick Mark Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 mt-6">
          {/* Class Select Dropdown */}
          <div className="lg:col-span-4">
            <label
              htmlFor="attendance-class-select"
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
            >
              Assigned Class / Course *
            </label>
            <div className="relative">
              <select
                id="attendance-class-select"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSubmitSuccess(null);
                }}
                className="w-full pl-3.5 pr-8 py-2.5 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code} — {cls.title} ({cls.grade})
                  </option>
                ))}
              </select>
            </div>
            {currentClassInfo && (
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                Instructor: {currentClassInfo.instructor} • Room: {currentClassInfo.room}
              </p>
            )}
          </div>

          {/* HTML Date Input */}
          <div className="lg:col-span-3">
            <label
              htmlFor="attendance-date-input"
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
            >
              Session Date *
            </label>
            <div className="relative">
              <input
                id="attendance-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSubmitSuccess(null);
                }}
                max="2030-12-31"
                min="2020-01-01"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Active Term: <span className="font-semibold text-slate-600">Fall 2025</span>
            </p>
          </div>

          {/* Batch 15-Second Action Shortcuts */}
          <div className="lg:col-span-5 flex flex-col justify-end">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Rapid Mark Controls (&lt;15s Marking)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="mark-all-present-btn"
                onClick={() => handleMarkAll('present')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                title="Set everyone to Present"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>All Present</span>
              </button>

              <button
                type="button"
                id="mark-all-absent-btn"
                onClick={() => handleMarkAll('absent')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Set everyone to Absent"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>All Absent</span>
              </button>

              <button
                type="button"
                id="view-audit-logs-toggle-btn"
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  showAuditLogs
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>{showAuditLogs ? 'Hide Audit Log' : 'Audit Trail'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {submitSuccess && (
        <div
          id="attendance-submission-success-banner"
          className="p-4 sm:p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-950">
                Bulk Attendance Successfully Recorded & Upserted!
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Atomic database transaction committed for {submitSuccess.count} student records on{' '}
                <span className="font-semibold">{selectedDate}</span>. Overwrite protection verified via unique constraint.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono text-emerald-700">
                <span>Audit Tx ID: {submitSuccess.txId}</span>
                <span>•</span>
                <span>Present: {submitSuccess.breakdown.present}</span>
                <span>•</span>
                <span>Absent: {submitSuccess.breakdown.absent}</span>
                <span>•</span>
                <span>Late: {submitSuccess.breakdown.late}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSubmitSuccess(null)}
            className="self-end sm:self-center px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <strong>Submission Error:</strong> {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 rounded"
          >
            Close
          </button>
        </div>
      )}

      {/* 3. Student Roster Table Component */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filter & Search Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">
              Class Roster ({filteredRoster.length} Students)
            </h4>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              • Tap status badge to switch
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Search inside class */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter roster..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="py-1.5 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
            >
              <option value="all">All ({roster.length})</option>
              <option value="present">Present ({stats.present})</option>
              <option value="absent">Absent ({stats.absent})</option>
              <option value="late">Late ({stats.late})</option>
            </select>
          </div>
        </div>

        {isLoadingRoster ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-600">Loading student roster for {currentClassInfo?.code || 'class'}...</p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <p className="text-sm font-semibold">No students found matching current filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="bulk-attendance-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 sm:px-6 w-12 text-center">#</th>
                  <th className="py-3 px-4 sm:px-6">Student Information</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Section / Track</th>
                  <th className="py-3 px-4 text-center sm:text-left min-w-[240px]">
                    Attendance Status (Single Click Action)
                  </th>
                  <th className="py-3 px-4">Note / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredRoster.map((student, index) => {
                  const currentStatus = attendanceState[student.student_id] || 'present';

                  return (
                    <tr
                      key={student.student_id}
                      className={`transition-colors ${
                        currentStatus === 'absent'
                          ? 'bg-rose-50/30 hover:bg-rose-50/50'
                          : currentStatus === 'late'
                          ? 'bg-amber-50/30 hover:bg-amber-50/50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Index Number */}
                      <td className="py-3.5 px-4 sm:px-6 text-center text-slate-400 font-mono text-xs">
                        {index + 1}
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          {student.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt={`${student.first_name} ${student.last_name}`}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {student.first_name[0]}
                              {student.last_name[0]}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {student.first_name} {student.last_name}
                            </span>
                            <span className="text-[11px] text-slate-400">{student.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {student.student_id}
                      </td>

                      {/* Grade & Section */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{student.grade}</span>
                        <div className="text-[11px] text-slate-400">{student.section}</div>
                      </td>

                      {/* Single Click Fast Badge Controls */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 gap-1">
                          {/* Present Badge Button */}
                          <button
                            type="button"
                            id={`status-present-${student.student_id}`}
                            onClick={() => handleSetStatus(student.student_id, 'present')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs scale-102'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                          {/* Absent Badge Button */}
                          <button
                            type="button"
                            id={`status-absent-${student.student_id}`}
                            onClick={() => handleSetStatus(student.student_id, 'absent')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs scale-102'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>

                          {/* Late Badge Button */}
                          <button
                            type="button"
                            id={`status-late-${student.student_id}`}
                            onClick={() => handleSetStatus(student.student_id, 'late')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 text-white shadow-xs scale-102'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Late</span>
                          </button>
                        </div>
                      </td>

                      {/* Optional Note Field */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          placeholder={currentStatus === 'absent' ? 'Reason for absence...' : currentStatus === 'late' ? 'Time arrived / reason...' : 'Note...'}
                          value={remarksState[student.student_id] || ''}
                          onChange={(e) =>
                            setRemarksState({
                              ...remarksState,
                              [student.student_id]: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white placeholder:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-700"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Prominent Submit Roster Button & Footer Summary */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-4">
            <span>
              Target Table: <code className="font-mono text-indigo-700 font-bold">attendance</code> (with <code className="font-mono text-slate-700">UNIQUE(student_id, date, class_id)</code>)
            </span>
            <span>•</span>
            <span>
              Audit Log: <code className="font-mono text-emerald-700 font-bold">audit_logs</code> (appended atomically)
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              id="reset-roster-defaults-btn"
              onClick={() => handleMarkAll('present')}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Reset to All Present
            </button>

            <button
              type="button"
              id="submit-roster-primary-btn"
              onClick={handleSubmitRoster}
              disabled={isSubmitting || roster.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Transaction...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Roster ({roster.length} Records)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Immutable Audit Logs Table (Collapsible) */}
      {showAuditLogs && (
        <div id="attendance-audit-ledger" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-slate-900 text-base">
                Immutable Attendance Audit Ledger (<code className="font-mono text-xs text-indigo-600">audit_logs</code>)
              </h4>
            </div>
            <button
              type="button"
              onClick={fetchAuditLogs}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {isLoadingLogs ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading audit history...</div>
          ) : auditLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No audit logs recorded yet. Submit attendance above to trigger the transactional log entry.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                    <th className="py-2.5 px-3 font-mono">Log ID</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action & Entity</th>
                    <th className="py-2.5 px-3">Class & Date</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Transaction Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => {
                    const details = log.details || {};
                    const breakdown: NonNullable<AuditLogEntry['details']['breakdown']> = details.breakdown || {
                      present: 0,
                      absent: 0,
                      late: 0,
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {log.id}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold font-mono text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {log.class_id} • {log.date}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {log.actor}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 font-bold">
                              {breakdown.present ?? 0} Pres
                            </span>
                            <span>/</span>
                            <span className="text-rose-700 font-bold">
                              {breakdown.absent ?? 0} Abs
                            </span>
                            <span>/</span>
                            <span className="text-amber-700 font-bold">
                              {breakdown.late ?? 0} Late
                            </span>
                            <span className="text-slate-400">
                              ({details.total_roster_size ?? 0} total)
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
