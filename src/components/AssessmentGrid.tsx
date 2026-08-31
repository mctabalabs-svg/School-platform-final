import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sliders,
  ShieldCheck,
  GraduationCap,
  Layers,
  FileSpreadsheet,
  Calculator,
  Award,
  ChevronDown,
  Info,
  History,
  Lock,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { CbcRating, SubjectItem, AssessmentItem } from '../types';

interface StudentRosterRow {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  grade: string;
  section: string;
  avatar_url?: string;
  raw_score: number | string;
  cbc_rating: CbcRating | '';
  teacher_comment: string;
  percentage?: number;
  grade_letter?: string;
}

const CBC_RUBRIC_CONFIG: Record<CbcRating, { label: string; fullTitle: string; color: string; bg: string; border: string; desc: string }> = {
  EE: {
    label: 'EE',
    fullTitle: 'Exceeding Expectation',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    desc: 'Demonstrates deep mastery, independent critical thought & high creative application (80-100%).',
  },
  ME: {
    label: 'ME',
    fullTitle: 'Meeting Expectation',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
    desc: 'Consistently demonstrates required core competence and skill accuracy (60-79%).',
  },
  AE: {
    label: 'AE',
    fullTitle: 'Approaching Expectation',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    desc: 'Demonstrates developing understanding with occasional guidance required (40-59%).',
  },
  BE: {
    label: 'BE',
    fullTitle: 'Below Expectation',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    desc: 'Requires intensive pedagogical intervention & reinforced foundational support (0-39%).',
  },
};

export const AssessmentGrid: React.FC = () => {
  // Config & Selector State
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('c-1');
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('sub-phy');
  const [selectedTermId, setSelectedTermId] = useState<string>('term-fall-2025');

  // Evaluation System Toggle: 'numeric' (8-4-4 Marks) vs 'cbc' (Kenya CBC Strand Rubric)
  const [evaluationMode, setEvaluationMode] = useState<'numeric' | 'cbc'>('cbc');
  
  // Assessment metadata fields
  const [assessmentTitle, setAssessmentTitle] = useState<string>('Term 1 Continuous Assessment & Competencies');
  const [strandName, setStrandName] = useState<string>('Scientific Inquiry & Technological Applications');
  const [subStrand, setSubStrand] = useState<string>('Experimental Modeling & Data Precision');
  const [assessmentType, setAssessmentType] = useState<string>('STRAND_EVALUATION');
  const [maxScore, setMaxScore] = useState<number>(100);
  const [weightage, setWeightage] = useState<number>(30);

  // Matrix Grid Roster Data
  const [roster, setRoster] = useState<StudentRosterRow[]>([]);
  const [existingAssessments, setExistingAssessments] = useState<AssessmentItem[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  // UI & Network Feedback States
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    transactionData?: any;
  } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState<boolean>(false);

  // 1. Initial Load: Fetch Classes, Subjects & Active Terms
  useEffect(() => {
    async function fetchInitialMeta() {
      try {
        const [clsRes, subRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/subjects'),
        ]);

        const clsData = await clsRes.json();
        const subData = await subRes.json();

        if (clsData.classes && clsData.classes.length > 0) {
          setClasses(clsData.classes);
          setSelectedClassId(clsData.classes[0].id);
        }

        if (subData.subjects && subData.subjects.length > 0) {
          setSubjects(subData.subjects);
          setSelectedSubjectId(subData.subjects[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial metadata:', err);
      }
    }
    fetchInitialMeta();
  }, []);

  // 2. Fetch Assessments & Student Roster whenever Class or Subject changes
  useEffect(() => {
    if (!selectedClassId) return;

    async function loadRosterAndAssessments() {
      setLoading(true);
      setStatusBanner(null);

      try {
        // A. Fetch Class Students
        const stuRes = await fetch(`/api/classes/${selectedClassId}/students`);
        const stuData = await stuRes.json();
        const studentsList = stuData.students || [];

        // B. Fetch existing assessments for this class + subject + term
        const asmRes = await fetch(
          `/api/assessments?class_id=${selectedClassId}&subject_id=${selectedSubjectId}&term_id=${selectedTermId}`
        );
        const asmData = await asmRes.json();
        const assessmentsList = asmData.assessments || [];
        setExistingAssessments(assessmentsList);

        // C. Fetch existing results if assessment exists
        let resultsMap: Record<string, any> = {};
        if (assessmentsList.length > 0) {
          const currentAsm = assessmentsList[0];
          setSelectedAssessmentId(currentAsm.id);
          setAssessmentTitle(currentAsm.title);
          setEvaluationMode(currentAsm.evaluation_system);
          if (currentAsm.strand_name) setStrandName(currentAsm.strand_name);
          if (currentAsm.sub_strand) setSubStrand(currentAsm.sub_strand);
          setMaxScore(Number(currentAsm.max_score || 100));

          const resRes = await fetch(`/api/assessments/results?assessment_id=${currentAsm.id}`);
          const resData = await resRes.json();
          if (resData.results) {
            resData.results.forEach((r: any) => {
              resultsMap[r.student_id] = r;
            });
          }
        } else {
          setSelectedAssessmentId('');
        }

        // Initialize spreadsheet grid rows
        const initialRoster: StudentRosterRow[] = studentsList.map((s: any) => {
          const existing = resultsMap[s.id];
          return {
            id: s.id,
            student_id: s.student_id,
            first_name: s.first_name,
            last_name: s.last_name,
            grade: s.grade,
            section: s.section,
            avatar_url: s.avatar_url,
            raw_score: existing?.raw_score ?? (evaluationMode === 'numeric' ? 75 : ''),
            cbc_rating: existing?.cbc_rating ?? (evaluationMode === 'cbc' ? 'ME' : ''),
            teacher_comment: existing?.teacher_comment || '',
            percentage: existing?.percentage,
            grade_letter: existing?.grade_letter,
          };
        });

        setRoster(initialRoster);
      } catch (err: any) {
        console.error('Error fetching matrix data:', err);
        setStatusBanner({
          type: 'error',
          message: 'Unable to synchronize student roster matrix.',
        });
      } finally {
        setLoading(false);
      }
    }

    loadRosterAndAssessments();
  }, [selectedClassId, selectedSubjectId, selectedTermId]);

  // Handle Assessment Selector switch
  const handleSelectExistingAssessment = async (asmId: string) => {
    setSelectedAssessmentId(asmId);
    if (!asmId) {
      setAssessmentTitle('New Continuous Assessment');
      return;
    }

    const target = existingAssessments.find((a) => a.id === asmId);
    if (target) {
      setAssessmentTitle(target.title);
      setEvaluationMode(target.evaluation_system);
      if (target.strand_name) setStrandName(target.strand_name);
      if (target.sub_strand) setSubStrand(target.sub_strand);
      setMaxScore(Number(target.max_score || 100));
      setWeightage(Number(target.weightage || 30));

      // Load results for this assessment
      try {
        const res = await fetch(`/api/assessments/results?assessment_id=${asmId}`);
        const data = await res.json();
        const resultsMap: Record<string, any> = {};
        (data.results || []).forEach((r: any) => {
          resultsMap[r.student_id] = r;
        });

        setRoster((prev) =>
          prev.map((row) => {
            const ex = resultsMap[row.id];
            return {
              ...row,
              raw_score: ex?.raw_score ?? '',
              cbc_rating: ex?.cbc_rating ?? '',
              teacher_comment: ex?.teacher_comment || '',
              percentage: ex?.percentage,
              grade_letter: ex?.grade_letter,
            };
          })
        );
      } catch (e) {
        console.error('Failed to load assessment scores:', e);
      }
    }
  };

  // Bulk Quick Action Helpers
  const handleSetAllCbc = (rating: CbcRating) => {
    setRoster((prev) =>
      prev.map((item) => ({
        ...item,
        cbc_rating: rating,
      }))
    );
  };

  const handleSetDefaultNumeric = (score: number) => {
    setRoster((prev) =>
      prev.map((item) => ({
        ...item,
        raw_score: score,
      }))
    );
  };

  const handleRowScoreChange = (id: string, val: string) => {
    setRoster((prev) =>
      prev.map((row) => (row.id === id ? { ...row, raw_score: val } : row))
    );
  };

  const handleRowCbcChange = (id: string, rating: CbcRating) => {
    setRoster((prev) =>
      prev.map((row) => (row.id === id ? { ...row, cbc_rating: rating } : row))
    );
  };

  const handleRowCommentChange = (id: string, comment: string) => {
    setRoster((prev) =>
      prev.map((row) => (row.id === id ? { ...row, teacher_comment: comment } : row))
    );
  };

  // 3. ATOMIC TRANSACTION SUBMISSION: POST /api/assessments/results
  const handleSubmitAssessmentScores = async () => {
    setSaving(true);
    setStatusBanner(null);

    try {
      // Prepare payload mapping directly to controller contract
      const recordsPayload = roster.map((r) => ({
        student_id: r.id,
        raw_score: evaluationMode === 'numeric' ? (r.raw_score !== '' ? Number(r.raw_score) : null) : null,
        cbc_rating: evaluationMode === 'cbc' ? (r.cbc_rating || null) : null,
        teacher_comment: r.teacher_comment || '',
      }));

      // Generate or retrieve Day 2 test JWT authorization header
      const tokenRes = await fetch('/api/auth/demo-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Dr. Eleanor Vance (Dean of Academics & Assessment)',
          role: 'teacher',
        }),
      });
      const tokenData = await tokenRes.json();
      const authToken = tokenData.token;

      const payload = {
        term_id: selectedTermId,
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        assessment_id: selectedAssessmentId || undefined,
        title: assessmentTitle,
        assessment_type: assessmentType,
        evaluation_system: evaluationMode,
        max_score: Number(maxScore),
        weightage: Number(weightage),
        strand_name: strandName,
        sub_strand: subStrand,
        records: recordsPayload,
      };

      const response = await fetch('/api/assessments/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'x-actor-name': 'Dr. Eleanor Vance (Dean of Academics & Assessment)',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to commit assessment transaction.');
      }

      setStatusBanner({
        type: 'success',
        message: `Evaluation entries committed successfully under ${evaluationMode.toUpperCase()} rubric.`,
        transactionData: data.data,
      });

      if (data.data?.assessment_id) {
        setSelectedAssessmentId(data.data.assessment_id);
      }

      // Refresh Audit Log records
      fetchAssessmentAuditLogs();
    } catch (err: any) {
      console.error('Error submitting assessment scores:', err);
      setStatusBanner({
        type: 'error',
        message: err.message || 'Atomic transaction failed while committing assessment marks.',
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchAssessmentAuditLogs = async () => {
    try {
      const res = await fetch('/api/assessments/audit-logs');
      const data = await res.json();
      if (data.logs) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  // Quick stats calculation for current grid
  const totalStudents = roster.length;
  const cbcStats = {
    EE: roster.filter((r) => r.cbc_rating === 'EE').length,
    ME: roster.filter((r) => r.cbc_rating === 'ME').length,
    AE: roster.filter((r) => r.cbc_rating === 'AE').length,
    BE: roster.filter((r) => r.cbc_rating === 'BE').length,
  };
  const numericFilled = roster.filter((r) => r.raw_score !== '' && !isNaN(Number(r.raw_score)));
  const numericMean =
    numericFilled.length > 0
      ? (
          numericFilled.reduce((acc, r) => acc + Number(r.raw_score), 0) /
          numericFilled.length
        ).toFixed(1)
      : '0.0';

  return (
    <div id="assessment-grading-engine" className="space-y-6">
      {/* 1. Header & Context Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200/60 uppercase tracking-wide">
                Continuous Assessment Engine (Days 7–8)
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                ACID Transactions & JWT Auth
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-indigo-600 shrink-0" />
              Spreadsheet Assessment & CBC Matrix
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Grade students across 8-4-4 Legacy Numeric Marks or Kenya's Competency-Based Curriculum (CBC) 
              strand rubrics with atomic PostgreSQL transaction commits and immutable audit tracking.
            </p>
          </div>

          {/* Evaluation Mode Toggle Switch */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shrink-0 self-start lg:self-center">
            <button
              type="button"
              id="toggle-cbc-mode"
              onClick={() => setEvaluationMode('cbc')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                evaluationMode === 'cbc'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Kenya CBC Rubric</span>
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[10px] rounded font-mono">
                EE • ME • AE • BE
              </span>
            </button>

            <button
              type="button"
              id="toggle-numeric-mode"
              onClick={() => setEvaluationMode('numeric')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                evaluationMode === 'numeric'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span>Numeric Marks</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded font-mono">
                0–100%
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Class, Subject & Assessment Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {/* Class Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Assigned Class / Grade
            </label>
            <select
              id="grading-class-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title} ({c.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Subject / Learning Area Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Subject / Learning Area
            </label>
            <select
              id="grading-subject-select"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          {/* Assessment Preset / New Assessment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Assessment Task / Rubric
            </label>
            <select
              id="grading-assessment-select"
              value={selectedAssessmentId}
              onChange={(e) => handleSelectExistingAssessment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
            >
              <option value="">+ New Assessment / Strand Session</option>
              {existingAssessments.map((asm) => (
                <option key={asm.id} value={asm.id}>
                  {asm.title} ({asm.evaluation_system.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Academic Term */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Academic Term
            </label>
            <select
              id="grading-term-select"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
            >
              <option value="term-fall-2025">Term 1 / Fall Term (Active)</option>
              <option value="term-spring-2026">Term 2 / Spring Term</option>
            </select>
          </div>
        </div>

        {/* Assessment Strand & Task Metadata Details */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Assessment Title
            </label>
            <input
              type="text"
              id="input-assessment-title"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              placeholder="e.g. End-Term Strand Practical Evaluation"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {evaluationMode === 'cbc' ? (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  CBC Key Strand
                </label>
                <input
                  type="text"
                  id="input-strand-name"
                  value={strandName}
                  onChange={(e) => setStrandName(e.target.value)}
                  placeholder="e.g. Scientific Inquiry & Logic"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  CBC Sub-Strand
                </label>
                <input
                  type="text"
                  id="input-sub-strand"
                  value={subStrand}
                  onChange={(e) => setSubStrand(e.target.value)}
                  placeholder="e.g. Hypothesis Testing & Data Recording"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Maximum Attainable Score
                </label>
                <input
                  type="number"
                  id="input-max-score"
                  min={1}
                  max={500}
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Term Weightage (% of Final Grade)
                </label>
                <input
                  type="number"
                  id="input-weightage"
                  min={1}
                  max={100}
                  value={weightage}
                  onChange={(e) => setWeightage(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Live Metric & Batch Fast-Fill Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Real-time Summary Cards */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-slate-600" />
            <span className="font-semibold text-slate-600">Roster:</span>
            <span className="font-black text-slate-900">{totalStudents} Students</span>
          </div>

          {evaluationMode === 'cbc' ? (
            <>
              <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                EE: {cbcStats.EE}
              </div>
              <div className="px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-200 text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                ME: {cbcStats.ME}
              </div>
              <div className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                AE: {cbcStats.AE}
              </div>
              <div className="px-3 py-1.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                BE: {cbcStats.BE}
              </div>
            </>
          ) : (
            <div className="px-3 py-1.5 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-200 text-xs font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Class Mean:</span>
              <span className="font-black text-indigo-700">{numericMean}%</span>
              <span className="text-slate-500 font-normal">({numericFilled.length}/{totalStudents} graded)</span>
            </div>
          )}
        </div>

        {/* Batch Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
            Quick Preset:
          </span>

          {evaluationMode === 'cbc' ? (
            <>
              <button
                type="button"
                id="preset-all-ee"
                onClick={() => handleSetAllCbc('EE')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                All EE
              </button>
              <button
                type="button"
                id="preset-all-me"
                onClick={() => handleSetAllCbc('ME')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                All ME
              </button>
              <button
                type="button"
                id="preset-all-ae"
                onClick={() => handleSetAllCbc('AE')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                All AE
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                id="preset-numeric-80"
                onClick={() => handleSetDefaultNumeric(85)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                Fill 85%
              </button>
              <button
                type="button"
                id="preset-numeric-70"
                onClick={() => handleSetDefaultNumeric(70)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                Fill 70%
              </button>
            </>
          )}

          <button
            type="button"
            id="preset-clear-matrix"
            onClick={() => {
              setRoster((prev) =>
                prev.map((r) => ({
                  ...r,
                  raw_score: '',
                  cbc_rating: '',
                  teacher_comment: '',
                }))
              );
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* 3. Transaction Feedback & Status Banner */}
      {statusBanner && (
        <div
          id="assessment-status-banner"
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <p className="text-xs sm:text-sm font-bold">{statusBanner.message}</p>
              {statusBanner.transactionData && (
                <p className="text-[11px] font-mono text-emerald-700 mt-0.5">
                  Audit Transaction ID: {statusBanner.transactionData.audit_log_id} • Committed at{' '}
                  {new Date(statusBanner.transactionData.saved_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100 self-start sm:self-center"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4. SPREADSHEET MATRIX TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">Synchronizing student assessment matrix...</p>
          </div>
        ) : roster.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-semibold">No students currently enrolled in this class.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="assessment-matrix-table">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[220px]">Student Identifier & Name</th>
                  <th className="py-3 px-4 w-28">Grade / Sec</th>

                  {evaluationMode === 'cbc' ? (
                    <>
                      <th className="py-3 px-4 min-w-[260px]">
                        CBC Strand Performance Rating (Rubric)
                      </th>
                      <th className="py-3 px-4 w-32 text-center">Standard Level</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4 w-40">Raw Score (/{maxScore})</th>
                      <th className="py-3 px-4 w-32 text-center">Percentage</th>
                      <th className="py-3 px-4 w-24 text-center">Letter Grade</th>
                    </>
                  )}

                  <th className="py-3 px-4 min-w-[240px]">Competency Comments & Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {roster.map((student, idx) => {
                  const currentNumeric =
                    student.raw_score !== '' && !isNaN(Number(student.raw_score))
                      ? Number(student.raw_score)
                      : null;
                  const computedPercentage =
                    currentNumeric !== null
                      ? ((currentNumeric / maxScore) * 100).toFixed(1)
                      : null;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                      id={`student-score-row-${student.id}`}
                    >
                      {/* Row Index */}
                      <td className="py-3 px-4 text-center text-xs font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Student Card */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              student.avatar_url ||
                              `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`
                            }
                            alt={student.first_name}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900">
                              {student.first_name} {student.last_name}
                            </p>
                            <span className="font-mono text-[11px] text-slate-400">
                              {student.student_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Grade & Section */}
                      <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                        {student.grade}
                        <div className="text-[10px] text-slate-400">{student.section}</div>
                      </td>

                      {/* EVALUATION COLUMNS */}
                      {evaluationMode === 'cbc' ? (
                        <>
                          {/* CBC Buttons / Radio Grid */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {(['EE', 'ME', 'AE', 'BE'] as CbcRating[]).map((rating) => {
                                const isSelected = student.cbc_rating === rating;
                                const cfg = CBC_RUBRIC_CONFIG[rating];

                                return (
                                  <button
                                    key={rating}
                                    type="button"
                                    onClick={() => handleRowCbcChange(student.id, rating)}
                                    title={`${cfg.fullTitle}: ${cfg.desc}`}
                                    className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-all flex items-center gap-1.5 ${
                                      isSelected
                                        ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-indigo-500/20 shadow-xs`
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{rating}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Level Badge Description */}
                          <td className="py-3 px-4 text-center">
                            {student.cbc_rating ? (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                  CBC_RUBRIC_CONFIG[student.cbc_rating].bg
                                } ${CBC_RUBRIC_CONFIG[student.cbc_rating].color} ${
                                  CBC_RUBRIC_CONFIG[student.cbc_rating].border
                                }`}
                              >
                                {CBC_RUBRIC_CONFIG[student.cbc_rating].fullTitle}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Unrated</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Numeric Score Input */}
                          <td className="py-3 px-4">
                            <div className="relative max-w-[120px]">
                              <input
                                type="number"
                                min={0}
                                max={maxScore}
                                step="0.5"
                                value={student.raw_score}
                                onChange={(e) => handleRowScoreChange(student.id, e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-black text-slate-900 text-right focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                              />
                            </div>
                          </td>

                          {/* Calculated Percentage */}
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                            {computedPercentage !== null ? `${computedPercentage}%` : '—'}
                          </td>

                          {/* Grade Letter */}
                          <td className="py-3 px-4 text-center font-black">
                            {computedPercentage !== null ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs ${
                                  Number(computedPercentage) >= 80
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : Number(computedPercentage) >= 60
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : Number(computedPercentage) >= 50
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {Number(computedPercentage) >= 80
                                  ? 'A'
                                  : Number(computedPercentage) >= 70
                                  ? 'B'
                                  : Number(computedPercentage) >= 60
                                  ? 'C'
                                  : Number(computedPercentage) >= 50
                                  ? 'D'
                                  : 'E'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </>
                      )}

                      {/* Qualitative Teacher Comment */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={student.teacher_comment}
                          onChange={(e) => handleRowCommentChange(student.id, e.target.value)}
                          placeholder="e.g. Excellent critical problem formulation..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Footer Bar */}
        <div className="bg-slate-50/90 border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Committed via PostgreSQL transaction with JWT Authenticated teacher role.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="view-audit-logs-btn"
              onClick={() => {
                setShowAuditLogs(!showAuditLogs);
                if (!showAuditLogs) fetchAssessmentAuditLogs();
              }}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>{showAuditLogs ? 'Hide Audit Log' : 'Inspect Audit Ledger'}</span>
            </button>

            <button
              type="button"
              id="submit-assessment-results-btn"
              disabled={saving || loading || roster.length === 0}
              onClick={handleSubmitAssessmentScores}
              className="px-6 py-2.5 text-xs sm:text-sm font-black rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Committing Transaction...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Commit Assessment Grades</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. CBC Competency Framework Descriptor Dossier */}
      <div className="bg-indigo-900/5 border border-indigo-100 rounded-2xl p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600" />
          Kenya Competency-Based Curriculum (CBC) Evaluation Standards
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {(['EE', 'ME', 'AE', 'BE'] as CbcRating[]).map((code) => {
            const item = CBC_RUBRIC_CONFIG[code];
            return (
              <div
                key={code}
                className={`p-3.5 rounded-xl border bg-white shadow-xs ${item.border}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${item.bg} ${item.color}`}>
                    {code}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">Level Code</span>
                </div>
                <h5 className="font-bold text-slate-900 text-xs mt-1">{item.fullTitle}</h5>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Immutable Audit Trail Ledger Drawer */}
      {showAuditLogs && (
        <div id="assessment-audit-ledger" className="bg-slate-900 text-slate-200 rounded-2xl p-5 shadow-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Immutable Assessment Audit Ledger (PostgreSQL)</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {auditLogs.length} Transactions Logged
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">No assessment audit entries committed yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 text-xs space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-indigo-300 font-bold">{log.id}</span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                    <span>
                      Actor: <strong className="text-white">{log.actor}</strong>
                    </span>
                    <span>
                      Class: <strong className="text-indigo-400">{log.class_id}</strong>
                    </span>
                    <span>
                      Entity: <strong className="text-emerald-400">{log.entity}</strong>
                    </span>
                  </div>
                  {log.details && (
                    <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[10px] text-slate-400 overflow-x-auto">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
