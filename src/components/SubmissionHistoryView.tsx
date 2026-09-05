import React, { useState, useMemo } from 'react';
import {
  FolderCheck,
  FileText,
  FileCode,
  FileArchive,
  File,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Filter,
  Award,
  BookOpen,
  Calendar,
  MessageSquare,
  Sparkles,
  RefreshCw,
  UploadCloud,
  ChevronRight,
  Info,
  X,
  Copy,
  Check
} from 'lucide-react';
import { SubmissionHistoryItem, StudentAssignmentItem } from '../types';

interface SubmissionHistoryViewProps {
  submissions: SubmissionHistoryItem[];
  assignments: StudentAssignmentItem[];
  studentMeta?: any;
  loading: boolean;
  onRefresh: () => void;
  onOpenResubmit: (assignment: StudentAssignmentItem) => void;
  onSwitchToAssignments: () => void;
}

export const SubmissionHistoryView: React.FC<SubmissionHistoryViewProps> = ({
  submissions,
  assignments,
  studentMeta,
  loading,
  onRefresh,
  onOpenResubmit,
  onSwitchToAssignments,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GRADED' | 'REVIEW'>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionHistoryItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Trigger temporary toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Helper for file type icons
  const getFileIcon = (fileName?: string | null, mimeType?: string | null) => {
    const name = (fileName || '').toLowerCase();
    if (name.endsWith('.pdf')) {
      return {
        icon: <FileText className="w-5 h-5 text-rose-600" />,
        bg: 'bg-rose-50 border-rose-200 text-rose-700',
        label: 'PDF Document',
      };
    }
    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.tar.gz')) {
      return {
        icon: <FileArchive className="w-5 h-5 text-amber-600" />,
        bg: 'bg-amber-50 border-amber-200 text-amber-700',
        label: 'ZIP Archive',
      };
    }
    if (
      name.endsWith('.ts') ||
      name.endsWith('.tsx') ||
      name.endsWith('.js') ||
      name.endsWith('.py') ||
      name.endsWith('.java') ||
      name.endsWith('.cpp') ||
      name.endsWith('.html') ||
      name.endsWith('.json')
    ) {
      return {
        icon: <FileCode className="w-5 h-5 text-cyan-600" />,
        bg: 'bg-cyan-50 border-cyan-200 text-cyan-700',
        label: 'Code File',
      };
    }
    if (name.endsWith('.docx') || name.endsWith('.doc')) {
      return {
        icon: <FileText className="w-5 h-5 text-blue-600" />,
        bg: 'bg-blue-50 border-blue-200 text-blue-700',
        label: 'Word Doc',
      };
    }
    return {
      icon: <File className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      label: 'Attachment',
    };
  };

  // Format file size
  const formatFileSize = (size?: string | number | null) => {
    if (!size) return 'File uploaded';
    if (typeof size === 'string') return size;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format timestamp
  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Real download simulator
  const handleDownloadFile = (item: SubmissionHistoryItem) => {
    const filename = item.file_name || `${item.assignment_title.replace(/\s+/g, '_')}_solution.pdf`;
    
    if (item.file_url && item.file_url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = item.file_url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloaded: ${filename}`);
      return;
    }

    // Generate readable file artifact
    const content = [
      `=============================================================`,
      `GREENFIELD SCHOLASTIC ACADEMY - STUDENT SUBMISSION ARCHIVE`,
      `=============================================================`,
      `Student Name:       ${studentMeta?.full_name || 'Student'}`,
      `Student ID:         ${studentMeta?.student_code || studentMeta?.id || 's-1'}`,
      `Assignment:         ${item.assignment_title}`,
      `Course:             ${item.subject_name} (${item.subject_code})`,
      `Class:              ${item.class_name} [${item.class_code}]`,
      `Submitted At:       ${new Date(item.submitted_at).toLocaleString()}`,
      `File Name:          ${item.file_name || 'solution_document.pdf'}`,
      `File Size:          ${formatFileSize(item.file_size)}`,
      item.external_link ? `External Repo/Link: ${item.external_link}` : '',
      `Grading Status:     ${item.is_graded ? 'GRADED' : 'UNDER REVIEW'}`,
      item.result
        ? `Score:              ${item.result.raw_score} / ${item.max_score} (${item.result.percentage}%)\nGrade:              ${item.result.grade_letter || 'N/A'} (Rating: ${item.result.cbc_rating || 'N/A'})\nTeacher Feedback:   ${item.result.teacher_comment || 'No feedback'}`
        : 'Teacher Evaluation: Pending review by instructor.',
      `-------------------------------------------------------------`,
      `STUDENT COMMENTS / NOTES:`,
      item.student_comments || 'No specific comments attached.',
      `-------------------------------------------------------------`,
      `SUBMISSION TEXT CONTENT:`,
      item.submission_text || 'Submitted via binary file attachment.',
      `=============================================================`,
    ].filter(Boolean).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.pdf') ? filename.replace('.pdf', '_record.txt') : filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Downloaded submission record: ${filename}`);
  };

  // Extract unique subjects
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    submissions.forEach((s) => {
      if (s.subject_name) subjects.add(s.subject_name);
    });
    return Array.from(subjects);
  }, [submissions]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      // Status filter
      if (statusFilter === 'GRADED' && !item.is_graded) return false;
      if (statusFilter === 'REVIEW' && item.is_graded) return false;

      // Subject filter
      if (subjectFilter !== 'ALL' && item.subject_name !== subjectFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = item.assignment_title.toLowerCase().includes(query);
        const matchFile = (item.file_name || '').toLowerCase().includes(query);
        const matchSubject = item.subject_name.toLowerCase().includes(query);
        const matchCode = item.subject_code.toLowerCase().includes(query);
        const matchComments = (item.student_comments || '').toLowerCase().includes(query);
        if (!matchTitle && !matchFile && !matchSubject && !matchCode && !matchComments) {
          return false;
        }
      }

      return true;
    });
  }, [submissions, statusFilter, subjectFilter, searchTerm]);

  // Analytics
  const gradedCount = submissions.filter((s) => s.is_graded).length;
  const reviewCount = submissions.length - gradedCount;
  const avgScore = useMemo(() => {
    const graded = submissions.filter((s) => s.is_graded && s.result?.percentage !== undefined);
    if (graded.length === 0) return 0;
    const total = graded.reduce((acc, curr) => acc + (curr.result?.percentage || 0), 0);
    return Math.round(total / graded.length);
  }, [submissions]);

  return (
    <div id="submission-history-section" className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Uploads
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{submissions.length}</span>
            <span className="text-xs text-slate-400">files & records</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Graded Works
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{gradedCount}</span>
            <span className="text-xs text-emerald-700/80 font-medium">with feedback</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Under Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{reviewCount}</span>
            <span className="text-xs text-amber-800/80 font-medium">pending grading</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Grade
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">
              {avgScore > 0 ? `${avgScore}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-400">on evaluated tasks</span>
          </div>
        </div>
      </div>

      {/* History Search & Filter Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search previous uploads by file name, assignment, or notes..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Subjects</option>
            {uniqueSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Submissions ({submissions.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('GRADED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'GRADED'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Graded ({gradedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('REVIEW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'REVIEW'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Under Review ({reviewCount})</span>
          </button>
        </div>
      </div>

      {/* Submissions List Container */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 mx-auto flex items-center justify-center mb-4">
            <FolderCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchTerm || statusFilter !== 'ALL' || subjectFilter !== 'ALL'
              ? 'No matching submission records found'
              : 'No coursework submitted yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5">
            {searchTerm || statusFilter !== 'ALL' || subjectFilter !== 'ALL'
              ? 'Try changing your search keywords or reset your filter filters above to view other records.'
              : 'When you upload files, code solutions, or documents for your assignments, their history and grading results will be tracked here.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {searchTerm || statusFilter !== 'ALL' || subjectFilter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setSubjectFilter('ALL');
                }}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={onSwitchToAssignments}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>View Pending Assignments</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => {
            const fileMeta = getFileIcon(sub.file_name, sub.attachment_type);
            const isGraded = sub.is_graded;
            const res = sub.result;

            // Find matching assignment item to allow resubmission
            const matchedAssignment = assignments.find((a) => a.id === sub.assessment_id);

            return (
              <div
                key={sub.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs hover:shadow-md ${
                  isGraded
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                {/* Header Strip with Grading Status */}
                <div
                  className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
                    isGraded
                      ? 'bg-emerald-50/50 border-emerald-100'
                      : 'bg-slate-50/70 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-700">{sub.class_name}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-medium text-slate-600">{sub.subject_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                      {sub.subject_code}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isGraded ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Graded & Finalized</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Submitted • Under Evaluation</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Card Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: File & Assignment Details (8 cols) */}
                    <div className="lg:col-span-8 space-y-4">
                      {/* Assignment Title & Meta */}
                      <div>
                        <h3 className="text-lg font-black text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer">
                          {sub.assignment_title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Submitted: {formatTimestamp(sub.submitted_at)}
                          </span>
                          <span>•</span>
                          <span>Weightage: {sub.weightage}%</span>
                          <span>•</span>
                          <span>Max Score: {sub.max_score} pts</span>
                        </div>
                      </div>

                      {/* Uploaded File Pill Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${fileMeta.bg}`}>
                            {fileMeta.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900 truncate max-w-xs md:max-w-md">
                                {sub.file_name || 'Attached Solution Document'}
                              </p>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 shrink-0">
                                {fileMeta.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Size: {formatFileSize(sub.file_size)} • Uploaded successfully
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDownloadFile(sub)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                          title="Download uploaded file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      </div>

                      {/* External Link or Student Comments if present */}
                      <div className="space-y-2">
                        {sub.external_link && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 font-medium">Repository / Link:</span>
                            <a
                              href={sub.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-1 truncate max-w-md"
                            >
                              <span>{sub.external_link}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </div>
                        )}

                        {sub.student_comments && (
                          <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 text-xs">
                            <div className="flex items-center gap-1.5 text-indigo-800 font-bold mb-1">
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Student Submission Notes:</span>
                            </div>
                            <p className="text-slate-700 italic">
                              "{sub.student_comments}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Grading Result or Review Status (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 pt-4 lg:pt-0">
                      {isGraded && res ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              Grade & Evaluation
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
                              {res.percentage}% Score
                            </span>
                          </div>

                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
                            <div className="text-2xl font-black text-emerald-800">
                              {res.raw_score}{' '}
                              <span className="text-sm font-semibold text-emerald-600">
                                / {sub.max_score} pts
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-2">
                              {res.grade_letter && (
                                <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-white text-emerald-900 border border-emerald-300 shadow-2xs">
                                  Grade {res.grade_letter}
                                </span>
                              )}
                              {res.cbc_rating && (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-200/70 text-emerald-900 border border-emerald-300">
                                  {res.cbc_rating === 'EE'
                                    ? 'Exceeding Expectations (EE)'
                                    : res.cbc_rating === 'ME'
                                    ? 'Meeting Expectations (ME)'
                                    : res.cbc_rating === 'AE'
                                    ? 'Approaching Expectations (AE)'
                                    : 'Below Expectations (BE)'}
                                </span>
                              )}
                            </div>
                          </div>

                          {res.teacher_comment && (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-2xs">
                              <span className="font-bold text-slate-800 block mb-1 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-amber-500" />
                                Teacher Feedback:
                              </span>
                              <p className="text-slate-600 leading-relaxed italic">
                                "{res.teacher_comment}"
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                            <Clock className="w-5 h-5 animate-pulse" />
                          </div>
                          <h4 className="text-xs font-bold text-amber-900">
                            Awaiting Teacher Evaluation
                          </h4>
                          <p className="text-[11px] text-amber-800/80 leading-relaxed">
                            Your upload has been securely submitted. The course instructor will evaluate your work and publish grading rubrics soon.
                          </p>
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="pt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSubmission(sub)}
                          className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Record</span>
                        </button>

                        {matchedAssignment && (
                          <button
                            type="button"
                            onClick={() => onOpenResubmit(matchedAssignment)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Resubmit or upload an updated solution"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Resubmit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <FolderCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Submission & Grading Record
                  </h3>
                  <p className="text-xs text-slate-500">
                    Record ID: {selectedSubmission.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Assignment Title Block */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-500 font-semibold mb-1">
                  <span>{selectedSubmission.class_name}</span>
                  <span>•</span>
                  <span>{selectedSubmission.subject_name} ({selectedSubmission.subject_code})</span>
                </div>
                <h2 className="text-base font-black text-slate-900">
                  {selectedSubmission.assignment_title}
                </h2>
                <div className="mt-2 flex items-center gap-4 text-slate-500">
                  <span>Assessment Type: {selectedSubmission.assessment_type}</span>
                  <span>Due: {selectedSubmission.due_date}</span>
                  <span>Weightage: {selectedSubmission.weightage}%</span>
                </div>
              </div>

              {/* Uploaded File Details */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Uploaded File Solution
                  </h4>
                  <span className="text-slate-400 text-[11px]">
                    Timestamp: {formatTimestamp(selectedSubmission.submitted_at)}
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {selectedSubmission.file_name || 'Solution_Document.pdf'}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        Size: {formatFileSize(selectedSubmission.file_size)} • Stored securely
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadFile(selectedSubmission)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>

                {selectedSubmission.external_link && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="font-semibold text-slate-600">External URL:</span>
                    <a
                      href={selectedSubmission.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-bold hover:underline flex items-center gap-1 truncate"
                    >
                      {selectedSubmission.external_link}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {selectedSubmission.student_comments && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-2">
                    <span className="font-semibold text-slate-700 block mb-0.5">
                      Student Remarks:
                    </span>
                    <p className="text-slate-600 italic">
                      "{selectedSubmission.student_comments}"
                    </p>
                  </div>
                )}
              </div>

              {/* Grading Status & Evaluator Rubrics */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Evaluation & Instructor Feedback
                </h4>

                {selectedSubmission.is_graded && selectedSubmission.result ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">
                          Raw Score
                        </span>
                        <span className="text-lg font-black text-emerald-800">
                          {selectedSubmission.result.raw_score} / {selectedSubmission.max_score}
                        </span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">
                          Percentage
                        </span>
                        <span className="text-lg font-black text-emerald-800">
                          {selectedSubmission.result.percentage}%
                        </span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">
                          Grade Letter
                        </span>
                        <span className="text-lg font-black text-emerald-800">
                          {selectedSubmission.result.grade_letter || 'A'}
                        </span>
                      </div>
                    </div>

                    {selectedSubmission.result.cbc_rating && (
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                        <span className="font-semibold text-slate-600">
                          CBC Competency Strand Rating:
                        </span>
                        <span className="font-bold text-indigo-700 px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full">
                          {selectedSubmission.result.cbc_rating === 'EE'
                            ? 'Exceeding Expectations (EE)'
                            : selectedSubmission.result.cbc_rating === 'ME'
                            ? 'Meeting Expectations (ME)'
                            : selectedSubmission.result.cbc_rating === 'AE'
                            ? 'Approaching Expectations (AE)'
                            : 'Below Expectations (BE)'}
                        </span>
                      </div>
                    )}

                    {selectedSubmission.result.teacher_comment && (
                      <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-xl">
                        <span className="font-bold text-emerald-900 block mb-1 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          Teacher Commentary:
                        </span>
                        <p className="text-slate-700 leading-relaxed italic">
                          "{selectedSubmission.result.teacher_comment}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                    <p className="font-bold text-amber-900">Grading Pending</p>
                    <p className="text-slate-600 mt-0.5">
                      Your coursework is currently in the instructor's grading queue.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
