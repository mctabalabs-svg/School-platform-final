import { Response } from 'express';
import { pglite } from './db';
import { AuthenticatedRequest } from './authMiddleware';

/**
 * CBC Strands & Performance Level Mappings
 * EE: Exceeding Expectation (Score equivalent ~ 80-100%)
 * ME: Meeting Expectation (Score equivalent ~ 60-79%)
 * AE: Approaching Expectation (Score equivalent ~ 40-59%)
 * BE: Below Expectation (Score equivalent ~ 0-39%)
 */
export const VALID_CBC_RATINGS = new Set(['EE', 'ME', 'AE', 'BE']);

export function calculateGradeLetter(score: number): string {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

export function cbcRatingToNumericEstimate(rating: string): number {
  switch (rating) {
    case 'EE': return 90;
    case 'ME': return 75;
    case 'AE': return 50;
    case 'BE': return 30;
    default: return 0;
  }
}

export function numericScoreToCbcRating(score: number): 'EE' | 'ME' | 'AE' | 'BE' {
  if (score >= 80) return 'EE';
  if (score >= 60) return 'ME';
  if (score >= 40) return 'AE';
  return 'BE';
}

export interface StudentScorePayload {
  student_id: string; // e.g. "s-1" or "STU-2024-001"
  raw_score?: number | string | null;
  cbc_rating?: 'EE' | 'ME' | 'AE' | 'BE' | string | null;
  teacher_comment?: string;
}

export interface SaveAssessmentResultsBody {
  term_id: string;
  class_id: string;
  subject_id: string;
  assessment_id?: string;
  title?: string;
  assessment_type?: 'CAT_1' | 'CAT_2' | 'STRAND_EVALUATION' | 'MID_TERM' | 'FINAL_EXAM' | string;
  evaluation_system: 'numeric' | 'cbc';
  max_score?: number;
  weightage?: number;
  strand_name?: string;
  sub_strand?: string;
  records: StudentScorePayload[];
}

/**
 * 1. COMPETENCY-BASED EXPRESS CONTROLLER:
 * POST /api/assessments/results
 * 
 * - Saves structural scores for term_id, class_id, subject_id
 * - Supports numeric marks & CBC strand ratings ('EE', 'ME', 'AE', 'BE')
 * - Atomic transaction updating `results` and safely inserting a tracking event into `audit_logs`
 * - Enforces Day 2 JWT authentication (`req.user`)
 */
export async function saveAssessmentResultsController(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      term_id,
      class_id,
      subject_id,
      assessment_id: inputAssessmentId,
      title,
      assessment_type,
      evaluation_system,
      max_score = 100,
      weightage = 30,
      strand_name = '',
      sub_strand = '',
      records,
    } = req.body as SaveAssessmentResultsBody;

    // 1. Mandatory validations
    if (!term_id || typeof term_id !== 'string') {
      return res.status(400).json({
        error: 'Validation failed: "term_id" is required and must be a valid string.',
      });
    }

    if (!class_id || typeof class_id !== 'string') {
      return res.status(400).json({
        error: 'Validation failed: "class_id" is required and must be a valid string.',
      });
    }

    if (!subject_id || typeof subject_id !== 'string') {
      return res.status(400).json({
        error: 'Validation failed: "subject_id" is required and must be a valid string.',
      });
    }

    if (!evaluation_system || !['numeric', 'cbc'].includes(evaluation_system)) {
      return res.status(400).json({
        error: 'Validation failed: "evaluation_system" must be either "numeric" or "cbc".',
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        error: 'Validation failed: "records" must be a non-empty array of student evaluations.',
      });
    }

    // 2. Validate individual student records
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (!rec.student_id) {
        return res.status(400).json({
          error: `Validation error at index ${i}: "student_id" is required.`,
        });
      }

      if (evaluation_system === 'cbc') {
        if (rec.cbc_rating && !VALID_CBC_RATINGS.has(rec.cbc_rating.toUpperCase())) {
          return res.status(400).json({
            error: `Validation error at index ${i}: Invalid CBC rating "${rec.cbc_rating}". Must be one of: 'EE', 'ME', 'AE', 'BE'.`,
          });
        }
      } else {
        if (rec.raw_score !== undefined && rec.raw_score !== null && rec.raw_score !== '') {
          const num = Number(rec.raw_score);
          if (isNaN(num) || num < 0 || num > Number(max_score)) {
            return res.status(400).json({
              error: `Validation error at index ${i}: Numeric score must be a number between 0 and ${max_score}. Received "${rec.raw_score}".`,
            });
          }
        }
      }
    }

    // Identify actor from Day 2 JWT token authentication
    const user = req.user;
    const actorName = user?.name || (req.headers['x-actor-name'] as string) || 'Faculty Instructor';
    const userRole = user?.role || 'teacher';

    // 3. Execute atomic transaction in PostgreSQL
    const transactionResult = await pglite.transaction(async (tx) => {
      const nowIso = new Date().toISOString();

      // Resolve or create the Assessment Header record
      let targetAssessmentId = inputAssessmentId;
      if (!targetAssessmentId) {
        targetAssessmentId = `asm_${class_id}_${subject_id}_${evaluation_system}_${Date.now()}`;
        const defaultTitle = title || (evaluation_system === 'cbc' 
          ? `CBC Competency Rubric: ${strand_name || 'Key Learning Strand'}`
          : `Continuous Assessment Test (${assessment_type || 'CAT 1'})`);

        await tx.query(
          `
          INSERT INTO assessments (
            id, title, class_id, subject_id, term_id, assessment_type,
            evaluation_system, max_score, weightage, strand_name, sub_strand, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            strand_name = EXCLUDED.strand_name,
            sub_strand = EXCLUDED.sub_strand;
          `,
          [
            targetAssessmentId,
            defaultTitle,
            class_id,
            subject_id,
            term_id,
            assessment_type || (evaluation_system === 'cbc' ? 'STRAND_EVALUATION' : 'CAT_1'),
            evaluation_system,
            Number(max_score),
            Number(weightage),
            strand_name,
            sub_strand,
            nowIso,
          ]
        );
      }

      // Upsert individual student scores
      const processedResults = [];
      const cbcBreakdown: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0, unassigned: 0 };
      let numericTotal = 0;
      let numericCount = 0;

      for (const rec of records) {
        // Resolve student PK if student_id is custom code e.g. STU-2024-001
        let studentDbId = rec.student_id;
        const studentLookup = await tx.query<{ id: string }>(
          'SELECT id FROM students WHERE id = $1 OR student_id = $1 LIMIT 1;',
          [rec.student_id]
        );
        if (studentLookup.rows.length > 0) {
          studentDbId = studentLookup.rows[0].id;
        }

        const resultId = `res_${targetAssessmentId}_${studentDbId}`;
        let rawScoreVal: number | null = null;
        let percentageVal: number | null = null;
        let gradeLetterVal: string | null = null;
        let cbcRatingVal: string | null = null;

        if (evaluation_system === 'cbc') {
          if (rec.cbc_rating) {
            cbcRatingVal = rec.cbc_rating.toUpperCase();
            cbcBreakdown[cbcRatingVal] = (cbcBreakdown[cbcRatingVal] || 0) + 1;
            rawScoreVal = cbcRatingToNumericEstimate(cbcRatingVal);
            percentageVal = rawScoreVal;
            gradeLetterVal = calculateGradeLetter(percentageVal);
          } else {
            cbcBreakdown.unassigned++;
          }
        } else {
          if (rec.raw_score !== undefined && rec.raw_score !== null && rec.raw_score !== '') {
            rawScoreVal = Number(rec.raw_score);
            percentageVal = Number(((rawScoreVal / Number(max_score)) * 100).toFixed(2));
            gradeLetterVal = calculateGradeLetter(percentageVal);
            cbcRatingVal = numericScoreToCbcRating(percentageVal);
            numericTotal += percentageVal;
            numericCount++;
          }
        }

        const comment = rec.teacher_comment || '';

        await tx.query(
          `
          INSERT INTO results (
            id, assessment_id, student_id, class_id, subject_id, term_id,
            evaluation_system, raw_score, percentage, grade_letter, cbc_rating, teacher_comment, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (assessment_id, student_id, term_id)
          DO UPDATE SET
            raw_score = EXCLUDED.raw_score,
            percentage = EXCLUDED.percentage,
            grade_letter = EXCLUDED.grade_letter,
            cbc_rating = EXCLUDED.cbc_rating,
            teacher_comment = EXCLUDED.teacher_comment,
            updated_at = EXCLUDED.updated_at;
          `,
          [
            resultId,
            targetAssessmentId,
            studentDbId,
            class_id,
            subject_id,
            term_id,
            evaluation_system,
            rawScoreVal,
            percentageVal,
            gradeLetterVal,
            cbcRatingVal,
            comment,
            nowIso,
            nowIso,
          ]
        );

        processedResults.push({
          student_id: rec.student_id,
          student_db_id: studentDbId,
          raw_score: rawScoreVal,
          percentage: percentageVal,
          grade_letter: gradeLetterVal,
          cbc_rating: cbcRatingVal,
        });
      }

      // Safe Audit Log Entry created in the EXACT same transaction
      const auditLogId = `aud_eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const auditEventDetails = JSON.stringify({
        event: 'ASSESSMENT_SCORES_UPSERT',
        assessment_id: targetAssessmentId,
        term_id,
        class_id,
        subject_id,
        evaluation_system,
        total_students: records.length,
        authenticated_user: {
          id: user?.id || 'sys-auth',
          name: actorName,
          role: userRole,
          school_id: user?.school_id || 'SCH-KEN-2026-001',
        },
        analytics: evaluation_system === 'cbc' ? { cbcBreakdown } : {
          mean_score: numericCount > 0 ? Number((numericTotal / numericCount).toFixed(2)) : 0,
          entries_count: numericCount,
        },
        ip_address: req.ip || '127.0.0.1',
      });

      await tx.query(
        `
        INSERT INTO audit_logs (
          id, action, entity, class_id, term_id, subject_id, date, actor, details, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `,
        [
          auditLogId,
          'ASSESSMENT_SCORES_UPSERT',
          'assessments',
          class_id,
          term_id,
          subject_id,
          new Date().toISOString().slice(0, 10),
          actorName,
          auditEventDetails,
          nowIso,
        ]
      );

      return {
        assessment_id: targetAssessmentId,
        audit_log_id: auditLogId,
        records_saved: records.length,
        evaluation_system,
        breakdown: evaluation_system === 'cbc' ? cbcBreakdown : {
          mean_percentage: numericCount > 0 ? Number((numericTotal / numericCount).toFixed(2)) : 0,
          graded_students: numericCount,
        },
        saved_at: nowIso,
        actor: actorName,
      };
    });

    return res.status(200).json({
      success: true,
      message: `Successfully processed assessment results for ${records.length} students under ${evaluation_system.toUpperCase()} evaluation framework.`,
      data: transactionResult,
    });
  } catch (error: any) {
    console.error('[Assessment Results Controller Error]:', error);
    return res.status(500).json({
      error: 'Database transaction failed while saving assessment results.',
      details: error.message || String(error),
    });
  }
}
