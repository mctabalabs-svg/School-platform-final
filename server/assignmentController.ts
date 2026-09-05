import { Response } from 'express';
import { pglite } from './db';
import { AuthenticatedRequest } from './authMiddleware';
import { logAuditEntry } from './authController';

/**
 * GET /api/students/:id/assignments
 * Retrieves all course assignments, due dates, instructions, submission status,
 * and teacher grading feedback for a specified student.
 */
export async function getStudentAssignmentsController(req: AuthenticatedRequest, res: Response) {
  try {
    const studentIdParam = req.params.id;

    // Resolve target student ID
    let targetStudentId = studentIdParam;
    if (!targetStudentId || targetStudentId === 'me' || targetStudentId === 'undefined' || targetStudentId === 'null') {
      if (req.user?.role === 'student') {
        targetStudentId = req.user.profile_id || 's-1';
      } else {
        targetStudentId = 's-1'; // Default demo student
      }
    }

    // Verify student exists and fetch student meta
    let studentRes = await pglite.query<any>(
      `SELECT id, student_id as student_code, user_id, first_name, last_name, 
              first_name || ' ' || last_name as full_name, grade, section, email
       FROM students 
       WHERE id = $1 OR student_id = $1 OR user_id = $1 OR LOWER(email) = LOWER($1)
       LIMIT 1;`,
      [targetStudentId]
    );

    // If not found and was not default s-1, gracefully fallback to demo student s-1
    if (studentRes.rows.length === 0) {
      studentRes = await pglite.query<any>(
        `SELECT id, student_id as student_code, user_id, first_name, last_name, 
                first_name || ' ' || last_name as full_name, grade, section, email
         FROM students 
         WHERE id = 's-1'
         LIMIT 1;`
      );
    }

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: `Student was not found.` });
    }

    const studentMeta = studentRes.rows[0];
    const internalStudentId = studentMeta.id;

    // Role check: If logged in as student, prevent viewing other students' assignments unless demo student
    if (
      req.user?.role === 'student' &&
      req.user.profile_id &&
      req.user.profile_id !== internalStudentId &&
      req.user.id !== studentMeta.user_id &&
      internalStudentId !== 's-1'
    ) {
      return res.status(403).json({
        error: 'Forbidden: Students are restricted to accessing their own assignments and submissions.',
      });
    }

    // Fetch assignments for student's enrolled courses, along with any existing submissions & grading results
    const assignmentsRes = await pglite.query<any>(
      `SELECT 
        a.id as assignment_id,
        a.title as assignment_title,
        a.class_id,
        a.subject_id,
        a.term_id,
        a.assessment_type,
        a.evaluation_system,
        a.max_score,
        a.weightage,
        a.strand_name,
        a.sub_strand,
        CASE 
          WHEN a.id = 'asm-3' THEN '2026-09-07'
          WHEN a.id = 'asm-4' THEN '2026-09-10'
          WHEN a.id = 'asm-2' THEN '2026-09-22'
          WHEN a.id = 'asm-1' THEN '2026-09-18'
          ELSE COALESCE(a.due_date, '2026-09-14')
        END as due_date,
        COALESCE(a.instructions, 'Complete the assigned questions and upload your work documentation before the due date.') as instructions,
        c.title as class_name,
        c.code as class_code,
        c.room,
        s.name as subject_name,
        s.code as subject_code,
        sub.id as submission_id,
        sub.submission_text,
        sub.file_name,
        sub.file_size,
        sub.file_url,
        sub.attachment_type,
        sub.external_link,
        sub.comments as student_comments,
        sub.status as raw_submission_status,
        sub.submitted_at,
        sub.updated_at as submission_updated_at,
        r.raw_score,
        r.percentage,
        r.grade_letter,
        r.cbc_rating,
        r.teacher_comment
       FROM assessments a
       JOIN classes c ON a.class_id = c.id
       JOIN subjects s ON a.subject_id = s.id
       LEFT JOIN enrollments e ON e.class_id = a.class_id AND e.student_id = $1
       LEFT JOIN assignment_submissions sub ON sub.assessment_id = a.id AND sub.student_id = $1
       LEFT JOIN results r ON r.assessment_id = a.id AND r.student_id = $1
       ORDER BY a.due_date ASC, a.created_at DESC;`,
      [internalStudentId]
    );

    // Compute status and format response
    const today = new Date().toISOString().split('T')[0];

    const formattedAssignments = assignmentsRes.rows.map((row) => {
      const isGraded = row.raw_score !== null && row.raw_score !== undefined;
      const isSubmitted = !!row.submission_id;
      const isOverdue = !isSubmitted && row.due_date && row.due_date < today;

      let status: 'graded' | 'submitted' | 'pending' | 'late' = 'pending';
      if (isGraded) {
        status = 'graded';
      } else if (isSubmitted) {
        status = 'submitted';
      } else if (isOverdue) {
        status = 'late';
      }

      return {
        id: row.assignment_id,
        title: row.assignment_title,
        class_id: row.class_id,
        class_name: row.class_name,
        class_code: row.class_code,
        room: row.room,
        subject_id: row.subject_id,
        subject_name: row.subject_name,
        subject_code: row.subject_code,
        term_id: row.term_id,
        assessment_type: row.assessment_type,
        evaluation_system: row.evaluation_system,
        max_score: Number(row.max_score || 100),
        weightage: Number(row.weightage || 20),
        strand_name: row.strand_name,
        sub_strand: row.sub_strand,
        due_date: row.due_date,
        instructions: row.instructions,
        status,
        is_overdue: isOverdue,
        submission: isSubmitted
          ? {
              id: row.submission_id,
              submission_text: row.submission_text,
              file_name: row.file_name,
              file_size: row.file_size,
              file_url: row.file_url,
              attachment_type: row.attachment_type,
              external_link: row.external_link,
              student_comments: row.student_comments,
              submitted_at: row.submitted_at,
              updated_at: row.submission_updated_at,
            }
          : null,
        result: isGraded
          ? {
              raw_score: Number(row.raw_score),
              percentage: Number(row.percentage || row.raw_score),
              grade_letter: row.grade_letter,
              cbc_rating: row.cbc_rating,
              teacher_comment: row.teacher_comment,
            }
          : null,
      };
    });

    // Fetch full submission history for this student (past file uploads, external links, grading status & notes)
    const historyRes = await pglite.query<any>(
      `SELECT 
        sub.id as submission_id,
        sub.assessment_id,
        a.title as assignment_title,
        c.title as class_name,
        c.code as class_code,
        s.name as subject_name,
        s.code as subject_code,
        a.max_score,
        a.weightage,
        a.due_date,
        a.evaluation_system,
        a.assessment_type,
        sub.file_name,
        sub.file_size,
        sub.file_url,
        sub.attachment_type,
        sub.external_link,
        sub.submission_text,
        sub.comments as student_comments,
        sub.submitted_at,
        sub.updated_at as submission_updated_at,
        sub.status as raw_submission_status,
        r.raw_score,
        r.percentage,
        r.grade_letter,
        r.cbc_rating,
        r.teacher_comment,
        r.updated_at as graded_at
       FROM assignment_submissions sub
       JOIN assessments a ON sub.assessment_id = a.id
       JOIN classes c ON a.class_id = c.id
       JOIN subjects s ON a.subject_id = s.id
       LEFT JOIN results r ON r.assessment_id = a.id AND r.student_id = sub.student_id
       WHERE sub.student_id = $1
       ORDER BY sub.submitted_at DESC;`,
      [internalStudentId]
    );

    const formattedHistory = historyRes.rows.map((row) => {
      const isGraded = row.raw_score !== null && row.raw_score !== undefined;
      return {
        id: row.submission_id,
        assessment_id: row.assessment_id,
        assignment_title: row.assignment_title,
        class_name: row.class_name,
        class_code: row.class_code,
        subject_name: row.subject_name,
        subject_code: row.subject_code,
        assessment_type: row.assessment_type,
        evaluation_system: row.evaluation_system,
        max_score: Number(row.max_score || 100),
        weightage: Number(row.weightage || 20),
        due_date: row.due_date,
        file_name: row.file_name,
        file_size: row.file_size,
        file_url: row.file_url,
        attachment_type: row.attachment_type,
        external_link: row.external_link,
        submission_text: row.submission_text,
        student_comments: row.student_comments,
        submitted_at: row.submitted_at,
        updated_at: row.submission_updated_at,
        status: isGraded ? 'graded' : (row.raw_submission_status || 'submitted'),
        is_graded: isGraded,
        result: isGraded
          ? {
              raw_score: Number(row.raw_score),
              percentage: Number(row.percentage || row.raw_score),
              grade_letter: row.grade_letter,
              cbc_rating: row.cbc_rating,
              teacher_comment: row.teacher_comment,
              graded_at: row.graded_at,
            }
          : null,
      };
    });

    const totalCount = formattedAssignments.length;
    const submittedCount = formattedAssignments.filter((a) => a.status === 'submitted' || a.status === 'graded').length;
    const pendingCount = formattedAssignments.filter((a) => a.status === 'pending' || a.status === 'late').length;
    const gradedCount = formattedAssignments.filter((a) => a.status === 'graded').length;
    const completionRate = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;

    return res.json({
      success: true,
      student: studentMeta,
      summary: {
        total_assignments: totalCount,
        submitted: submittedCount,
        pending: pendingCount,
        graded: gradedCount,
        completion_rate: completionRate,
        total_uploads: formattedHistory.length,
      },
      assignments: formattedAssignments,
      submission_history: formattedHistory,
    });
  } catch (error: any) {
    console.error('Error in getStudentAssignmentsController:', error);
    return res.status(500).json({
      error: 'Failed to retrieve assignments.',
      details: error.message,
    });
  }
}

/**
 * POST /api/students/:id/submissions
 * Submits an assignment solution (file upload, text answers, or external repo link).
 */
export async function submitAssignmentController(req: AuthenticatedRequest, res: Response) {
  try {
    const studentIdParam = req.params.id;
    let targetStudentId = studentIdParam;

    if (!targetStudentId || targetStudentId === 'me' || targetStudentId === 'undefined' || targetStudentId === 'null') {
      if (req.user?.role === 'student') {
        targetStudentId = req.user.profile_id || 's-1';
      } else {
        targetStudentId = req.body.student_id || 's-1';
      }
    }

    // Check student existence
    let stuCheck = await pglite.query<any>(
      `SELECT id, first_name, last_name, user_id, student_id as student_code, email 
       FROM students 
       WHERE id = $1 OR student_id = $1 OR user_id = $1 OR LOWER(email) = LOWER($1) 
       LIMIT 1;`,
      [targetStudentId]
    );

    if (stuCheck.rows.length === 0) {
      stuCheck = await pglite.query<any>(
        `SELECT id, first_name, last_name, user_id, student_id as student_code, email FROM students WHERE id = 's-1' LIMIT 1;`
      );
    }

    if (stuCheck.rows.length === 0) {
      return res.status(404).json({ error: `Student not found.` });
    }

    const student = stuCheck.rows[0];
    const internalStudentId = student.id;

    // Role check: If logged in as student, cannot submit for someone else
    if (
      req.user?.role === 'student' &&
      req.user.profile_id &&
      req.user.profile_id !== internalStudentId &&
      req.user.id !== student.user_id &&
      internalStudentId !== 's-1'
    ) {
      return res.status(403).json({
        error: 'Forbidden: You are only authorized to submit assignments for your own student profile.',
      });
    }

    const {
      assessment_id,
      submission_text,
      file_name,
      file_size,
      file_url,
      attachment_type,
      external_link,
      comments,
    } = req.body;

    if (!assessment_id) {
      return res.status(400).json({ error: 'Assessment ID is required to submit an assignment.' });
    }

    // Ensure at least one submission medium is provided
    const hasText = submission_text && submission_text.trim().length > 0;
    const hasFile = (file_name && file_name.trim().length > 0) || (file_url && file_url.trim().length > 0);
    const hasLink = external_link && external_link.trim().length > 0;

    if (!hasText && !hasFile && !hasLink) {
      return res.status(400).json({
        error: 'Please provide a file attachment, text solution, or external link to submit.',
      });
    }

    // Check if assessment exists
    const asmCheck = await pglite.query<any>(
      `SELECT id, title, max_score, class_id FROM assessments WHERE id = $1 LIMIT 1;`,
      [assessment_id]
    );

    if (asmCheck.rows.length === 0) {
      return res.status(404).json({ error: `Assessment with ID '${assessment_id}' does not exist.` });
    }

    const assessment = asmCheck.rows[0];

    // Generate submission ID
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Upsert submission
    const upsertRes = await pglite.query<any>(
      `INSERT INTO assignment_submissions (
        id,
        assessment_id,
        student_id,
        submission_text,
        file_name,
        file_size,
        file_url,
        attachment_type,
        external_link,
        comments,
        status,
        submitted_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'submitted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (assessment_id, student_id) DO UPDATE SET
        submission_text = EXCLUDED.submission_text,
        file_name = COALESCE(EXCLUDED.file_name, assignment_submissions.file_name),
        file_size = COALESCE(EXCLUDED.file_size, assignment_submissions.file_size),
        file_url = COALESCE(EXCLUDED.file_url, assignment_submissions.file_url),
        attachment_type = COALESCE(EXCLUDED.attachment_type, assignment_submissions.attachment_type),
        external_link = EXCLUDED.external_link,
        comments = EXCLUDED.comments,
        status = 'submitted',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;`,
      [
        submissionId,
        assessment_id,
        internalStudentId,
        submission_text ? submission_text.trim() : null,
        file_name || null,
        file_size || null,
        file_url || null,
        attachment_type || null,
        external_link ? external_link.trim() : null,
        comments ? comments.trim() : null,
      ]
    );

    const savedSubmission = upsertRes.rows[0];

    // Log Audit Trail
    const actorName = req.user?.name || req.user?.email || `${student.first_name} ${student.last_name}`;
    await logAuditEntry(pglite, {
      action: 'ASSIGNMENT_SUBMITTED',
      entity: 'STUDENT_ACADEMICS',
      actor: actorName,
      details: {
        submission_id: savedSubmission.id,
        assessment_id,
        assessment_title: assessment.title,
        student_id: internalStudentId,
        student_name: `${student.first_name} ${student.last_name}`,
        file_name: file_name || null,
        file_size: file_size || null,
        has_text: hasText,
        has_link: hasLink,
        submitted_at: savedSubmission.submitted_at,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Assignment "${assessment.title}" submitted successfully!`,
      submission: savedSubmission,
    });
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    return res.status(500).json({
      error: 'Failed to record assignment submission.',
      details: error.message,
    });
  }
}

/**
 * DELETE /api/students/:studentId/submissions/:assessmentId
 * Allows a student or teacher to un-submit or clear a submission if needed.
 */
export async function deleteSubmissionController(req: AuthenticatedRequest, res: Response) {
  try {
    const { studentId, assessmentId } = req.params;

    if (!studentId || !assessmentId) {
      return res.status(400).json({ error: 'Both studentId and assessmentId are required.' });
    }

    // Role check: Student can only retract their own submission
    if (req.user?.role === 'student' && req.user.profile_id && req.user.profile_id !== studentId) {
      return res.status(403).json({ error: 'Forbidden: You cannot retract another student’s submission.' });
    }

    await pglite.query(
      `DELETE FROM assignment_submissions WHERE student_id = $1 AND assessment_id = $2;`,
      [studentId, assessmentId]
    );

    const actorName = req.user?.name || req.user?.email || 'Student';
    await logAuditEntry(pglite, {
      action: 'ASSIGNMENT_RETRACTED',
      entity: 'STUDENT_ACADEMICS',
      actor: actorName,
      details: {
        student_id: studentId,
        assessment_id: assessmentId,
        timestamp: new Date().toISOString(),
      },
    });

    return res.json({
      success: true,
      message: 'Assignment submission has been retracted successfully.',
    });
  } catch (error: any) {
    console.error('Error retracting submission:', error);
    return res.status(500).json({ error: 'Failed to retract submission.', details: error.message });
  }
}

/**
 * GET /api/students/:id/submission-history
 * Dedicated endpoint to retrieve full submission history and grading status for a student.
 */
export async function getStudentSubmissionHistoryController(req: AuthenticatedRequest, res: Response) {
  try {
    const studentIdParam = req.params.id;
    let targetStudentId = studentIdParam;
    if (!targetStudentId || targetStudentId === 'me' || targetStudentId === 'undefined' || targetStudentId === 'null') {
      if (req.user?.role === 'student') {
        targetStudentId = req.user.profile_id || 's-1';
      } else {
        targetStudentId = 's-1';
      }
    }

    let studentRes = await pglite.query<any>(
      `SELECT id, student_id as student_code, user_id, first_name, last_name, 
              first_name || ' ' || last_name as full_name, grade, section, email
       FROM students 
       WHERE id = $1 OR student_id = $1 OR user_id = $1 OR LOWER(email) = LOWER($1)
       LIMIT 1;`,
      [targetStudentId]
    );

    if (studentRes.rows.length === 0) {
      studentRes = await pglite.query<any>(
        `SELECT id, student_id as student_code, user_id, first_name, last_name, 
                first_name || ' ' || last_name as full_name, grade, section, email
         FROM students 
         WHERE id = 's-1'
         LIMIT 1;`
      );
    }

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: `Student was not found.` });
    }

    const studentMeta = studentRes.rows[0];
    const internalStudentId = studentMeta.id;

    const historyRes = await pglite.query<any>(
      `SELECT 
        sub.id as submission_id,
        sub.assessment_id,
        a.title as assignment_title,
        c.title as class_name,
        c.code as class_code,
        s.name as subject_name,
        s.code as subject_code,
        a.max_score,
        a.weightage,
        a.due_date,
        a.evaluation_system,
        a.assessment_type,
        sub.file_name,
        sub.file_size,
        sub.file_url,
        sub.attachment_type,
        sub.external_link,
        sub.submission_text,
        sub.comments as student_comments,
        sub.submitted_at,
        sub.updated_at as submission_updated_at,
        sub.status as raw_submission_status,
        r.raw_score,
        r.percentage,
        r.grade_letter,
        r.cbc_rating,
        r.teacher_comment,
        r.updated_at as graded_at
       FROM assignment_submissions sub
       JOIN assessments a ON sub.assessment_id = a.id
       JOIN classes c ON a.class_id = c.id
       JOIN subjects s ON a.subject_id = s.id
       LEFT JOIN results r ON r.assessment_id = a.id AND r.student_id = sub.student_id
       WHERE sub.student_id = $1
       ORDER BY sub.submitted_at DESC;`,
      [internalStudentId]
    );

    const formattedHistory = historyRes.rows.map((row) => {
      const isGraded = row.raw_score !== null && row.raw_score !== undefined;
      return {
        id: row.submission_id,
        assessment_id: row.assessment_id,
        assignment_title: row.assignment_title,
        class_name: row.class_name,
        class_code: row.class_code,
        subject_name: row.subject_name,
        subject_code: row.subject_code,
        assessment_type: row.assessment_type,
        evaluation_system: row.evaluation_system,
        max_score: Number(row.max_score || 100),
        weightage: Number(row.weightage || 20),
        due_date: row.due_date,
        file_name: row.file_name,
        file_size: row.file_size,
        file_url: row.file_url,
        attachment_type: row.attachment_type,
        external_link: row.external_link,
        submission_text: row.submission_text,
        student_comments: row.student_comments,
        submitted_at: row.submitted_at,
        updated_at: row.submission_updated_at,
        status: isGraded ? 'graded' : (row.raw_submission_status || 'submitted'),
        is_graded: isGraded,
        result: isGraded
          ? {
              raw_score: Number(row.raw_score),
              percentage: Number(row.percentage || row.raw_score),
              grade_letter: row.grade_letter,
              cbc_rating: row.cbc_rating,
              teacher_comment: row.teacher_comment,
              graded_at: row.graded_at,
            }
          : null,
      };
    });

    const gradedCount = formattedHistory.filter(h => h.is_graded).length;
    const pendingCount = formattedHistory.length - gradedCount;

    return res.json({
      success: true,
      student: studentMeta,
      summary: {
        total_submissions: formattedHistory.length,
        graded: gradedCount,
        pending_review: pendingCount,
      },
      submissions: formattedHistory,
    });
  } catch (error: any) {
    console.error('Error in getStudentSubmissionHistoryController:', error);
    return res.status(500).json({
      error: 'Failed to retrieve submission history.',
      details: error.message,
    });
  }
}

