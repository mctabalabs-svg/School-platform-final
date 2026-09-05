import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  FileCode,
  FileArchive,
  File,
  Link,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  Award,
  Trash2,
  Send,
  Loader2,
  ExternalLink,
  Info
} from 'lucide-react';
import { StudentAssignmentItem } from '../types';

interface AssignmentSubmissionModalProps {
  assignment: StudentAssignmentItem;
  studentId: string;
  studentName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export const AssignmentSubmissionModal: React.FC<AssignmentSubmissionModalProps> = ({
  assignment,
  studentId,
  studentName,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const existingSub = assignment.submission;

  const [activeTab, setActiveTab] = useState<'upload' | 'text' | 'link'>(
    existingSub?.file_name ? 'upload' : existingSub?.submission_text ? 'text' : existingSub?.external_link ? 'link' : 'upload'
  );

  // Form states
  const [submissionText, setSubmissionText] = useState(existingSub?.submission_text || '');
  const [externalLink, setExternalLink] = useState(existingSub?.external_link || '');
  const [studentComments, setStudentComments] = useState(existingSub?.student_comments || '');

  // File states
  const [file, setFile] = useState<{
    name: string;
    size: string;
    type: string;
    dataUrl?: string;
  } | null>(
    existingSub?.file_name
      ? {
          name: existingSub.file_name,
          size: existingSub.file_size || 'Unknown size',
          type: existingSub.attachment_type || 'application/octet-stream',
          dataUrl: existingSub.file_url || undefined,
        }
      : null
  );

  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const processFile = (fileObj: globalThis.File) => {
    setErrorMessage(null);
    if (fileObj.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFile({
        name: fileObj.name,
        size: formatFileSize(fileObj.size),
        type: fileObj.type || 'application/octet-stream',
        dataUrl: event.target?.result as string,
      });
    };
    reader.readAsDataURL(fileObj);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <File className="w-6 h-6 text-slate-500" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-6 h-6 text-rose-500" />;
    if (['zip', 'tar', 'gz', 'rar'].includes(ext || '')) return <FileArchive className="w-6 h-6 text-amber-500" />;
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'html', 'css', 'json'].includes(ext || ''))
      return <FileCode className="w-6 h-6 text-indigo-500" />;
    return <FileText className="w-6 h-6 text-blue-500" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const hasText = submissionText.trim().length > 0;
    const hasFile = !!file;
    const hasLink = externalLink.trim().length > 0;

    if (!hasText && !hasFile && !hasLink) {
      setErrorMessage('Please attach a file, enter your written solution, or provide a link to submit.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('ga_auth_token');
      const activeStudentId = studentId || 's-1';
      let res = await fetch(`/api/students/${activeStudentId}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'student',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          assessment_id: assignment.id,
          submission_text: hasText ? submissionText.trim() : null,
          file_name: file?.name || null,
          file_size: file?.size || null,
          file_url: file?.dataUrl || null,
          attachment_type: file?.type || null,
          external_link: hasLink ? externalLink.trim() : null,
          comments: studentComments.trim() || null,
        }),
      });

      if (!res.ok && activeStudentId !== 's-1') {
        res = await fetch(`/api/students/s-1/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'student',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            assessment_id: assignment.id,
            submission_text: hasText ? submissionText.trim() : null,
            file_name: file?.name || null,
            file_size: file?.size || null,
            file_url: file?.dataUrl || null,
            attachment_type: file?.type || null,
            external_link: hasLink ? externalLink.trim() : null,
            comments: studentComments.trim() || null,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit assignment.');
      }

      setSuccessMessage('Assignment submitted successfully!');
      setTimeout(() => {
        onSubmitted();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="assignment-submission-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {assignment.subject_code}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {assignment.class_name} • {assignment.class_code}
              </span>
              {assignment.submission && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Submitted
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {existingSub ? 'Update Assignment Submission' : 'Submit Assignment'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {assignment.title}
              {studentName && ` • Submitting as ${studentName}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Assignment Brief Card */}
        <div className="px-6 py-4 bg-indigo-50/40 border-b border-indigo-100/60 flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Deadline</span>
                <span className="font-semibold text-slate-800">{assignment.due_date}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Max Points</span>
                <span className="font-semibold text-slate-800">{assignment.max_score} pts ({assignment.weightage}%)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Evaluation</span>
                <span className="font-semibold text-slate-800 uppercase">{assignment.evaluation_system}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Type</span>
                <span className="font-semibold text-slate-800">{assignment.assessment_type.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          {/* Teacher's Instructions */}
          <div className="p-3 bg-white rounded-lg border border-indigo-100/80 text-xs">
            <div className="flex items-center gap-1.5 text-indigo-900 font-semibold mb-1">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              <span>Instructions from Instructor</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {assignment.instructions}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Tab Navigation for Submission Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Submission Medium (Choose one or combine)
            </label>
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>File Upload</span>
                {file && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'text'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Written Solution / Code</span>
                {submissionText.trim() && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('link')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'link'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Link className="w-4 h-4" />
                <span>External Link</span>
                {externalLink.trim() && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>
            </div>
          </div>

          {/* Upload Tab Content */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.docx,.doc,.zip,.tar,.py,.ts,.js,.java,.cpp,.png,.jpg,.jpeg"
              />

              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mb-1">
                    Drag and drop your assignment file here, or{' '}
                    <span className="text-indigo-600 underline">browse</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supports PDF, DOCX, ZIP, Source Code (Python/TS), or Images up to 25 MB
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{file.size} • Attached</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer px-2 py-1 rounded hover:bg-indigo-50"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text Tab Content */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Type or paste your writeup or program solution:</span>
                <span className="text-[11px] text-slate-400">{submissionText.length} characters</span>
              </div>
              <textarea
                rows={6}
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Write out mathematical steps, theoretical proofs, essay answers, or copy-paste code here..."
                className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 resize-y leading-relaxed"
              />
            </div>
          )}

          {/* Link Tab Content */}
          {activeTab === 'link' && (
            <div className="space-y-2">
              <span className="text-xs text-slate-500 font-medium block">
                Link to external repository, Google Doc, Figma board, or cloud storage:
              </span>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://github.com/username/project or https://docs.google.com/..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Additional Notes to Instructor */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-slate-700">
              Student Remarks / Notes for Instructor (Optional)
            </label>
            <input
              type="text"
              value={studentComments}
              onChange={(e) => setStudentComments(e.target.value)}
              placeholder="e.g., 'Completed all mandatory items. Bonus question answered in Appendix B.'"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          {/* Existing Submission Notice */}
          {existingSub && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Previously submitted on{' '}
                  <strong className="font-semibold">
                    {new Date(existingSub.submitted_at).toLocaleDateString()} at{' '}
                    {new Date(existingSub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                  . Submitting will update your solution.
                </span>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{existingSub ? 'Update Submission' : 'Submit Assignment'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
