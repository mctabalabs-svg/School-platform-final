import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pglite } from './db';
import { AuthenticatedRequest } from './authMiddleware';
import { logAuditEntry } from './authController';

/**
 * GET /api/admin/parents
 * Lists all parent accounts with their profile metadata and currently linked students.
 */
export async function getParentsController(req: Request, res: Response) {
  try {
    const parentsRes = await pglite.query<any>(`
      SELECT 
        u.id as user_id,
        u.school_id,
        u.email,
        u.first_name,
        u.last_name,
        u.first_name || ' ' || u.last_name as full_name,
        u.status,
        u.created_at,
        p.id as parent_id,
        p.national_id,
        p.occupation,
        COALESCE(p.phone, '') as phone
      FROM users u
      LEFT JOIN parents p ON u.id = p.user_id
      WHERE u.role = 'parent'
      ORDER BY u.created_at DESC;
    `);

    // Fetch all parent-student relations with student details
    const relationsRes = await pglite.query<any>(`
      SELECT 
        ps.id as link_id,
        ps.parent_id,
        ps.parent_user_id,
        ps.student_id,
        ps.relationship,
        s.student_id as student_code,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.first_name || ' ' || s.last_name as student_name,
        s.grade,
        s.section,
        s.avatar_url
      FROM parent_students ps
      JOIN students s ON ps.student_id = s.id
      ORDER BY s.first_name ASC;
    `);

    const parentsWithChildren = parentsRes.rows.map((parent) => {
      const children = relationsRes.rows.filter(
        (r) =>
          (parent.parent_id && r.parent_id === parent.parent_id) ||
          r.parent_user_id === parent.user_id
      );
      return {
        ...parent,
        linked_children: children,
        children_count: children.length,
      };
    });

    return res.json({
      success: true,
      count: parentsWithChildren.length,
      parents: parentsWithChildren,
    });
  } catch (error: any) {
    console.error('Error fetching parents:', error);
    return res.status(500).json({ error: 'Failed to retrieve parents list.', details: error.message });
  }
}

/**
 * POST /api/admin/parents
 * Creates a new Parent user account and linked secondary parent profile.
 */
export async function createParentController(req: AuthenticatedRequest, res: Response) {
  const { name, first_name, last_name, email, password, phone, national_id, occupation } = req.body;

  // 1. Client & Server-side validation
  let fName = first_name?.trim();
  let lName = last_name?.trim();

  if (!fName && name) {
    const parts = name.trim().split(' ');
    fName = parts[0];
    lName = parts.slice(1).join(' ') || 'Parent';
  }

  if (!fName || !lName) {
    return res.status(400).json({ error: 'Full Name (first and last name) is required.' });
  }

  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Password is required and must be at least 6 characters.' });
  }

  if (!phone || String(phone).trim().length < 7) {
    return res.status(400).json({ error: 'A valid phone number is required (e.g., +254 700 000000).' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPhone = String(phone).trim();

  try {
    // Check if email already registered
    const existing = await pglite.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1;', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: `A user account with email "${normalizedEmail}" already exists in the system.`,
      });
    }

    const userId = `usr-parent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const parentProfileId = `prt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const schoolId = req.user?.school_id || 'SCH-KEN-2026-001';

    // Hash password with bcrypt
    const passwordHash = bcrypt.hashSync(String(password), 10);

    // Database Transaction
    await pglite.query('BEGIN;');

    try {
      // 1. Insert into users table
      await pglite.query(
        `INSERT INTO users (id, school_id, email, password_hash, first_name, last_name, role, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [userId, schoolId, normalizedEmail, passwordHash, fName, lName, 'parent', 'active']
      );

      // 2. Insert into parents table
      await pglite.query(
        `INSERT INTO parents (id, user_id, national_id, occupation, phone)
         VALUES ($1, $2, $3, $4, $5);`,
        [parentProfileId, userId, national_id?.trim() || null, occupation?.trim() || 'Parent/Guardian', normalizedPhone]
      );

      // 3. Log audit event
      const actorName = req.user?.name || req.user?.email || 'System Administrator';
      await logAuditEntry(pglite, {
        action: 'PARENT_ACCOUNT_CREATED',
        entity: 'USER_MANAGEMENT',
        actor: actorName,
        details: {
          user_id: userId,
          parent_profile_id: parentProfileId,
          parent_name: `${fName} ${lName}`,
          email: normalizedEmail,
          phone: normalizedPhone,
          timestamp: new Date().toISOString(),
        },
      });

      await pglite.query('COMMIT;');

      return res.status(201).json({
        success: true,
        message: `Parent account for ${fName} ${lName} created successfully.`,
        parent: {
          user_id: userId,
          parent_id: parentProfileId,
          school_id: schoolId,
          first_name: fName,
          last_name: lName,
          full_name: `${fName} ${lName}`,
          email: normalizedEmail,
          phone: normalizedPhone,
          national_id: national_id?.trim() || null,
          occupation: occupation?.trim() || 'Parent/Guardian',
          role: 'parent',
          status: 'active',
          linked_children: [],
          children_count: 0,
        },
      });
    } catch (txErr: any) {
      await pglite.query('ROLLBACK;');
      throw txErr;
    }
  } catch (error: any) {
    console.error('Error creating parent account:', error);
    return res.status(500).json({ error: 'Failed to create parent account.', details: error.message });
  }
}

/**
 * POST /api/admin/parents/link-students
 * Links a target Parent account to multiple selected Students in parent_students table.
 */
export async function linkParentToStudentsController(req: AuthenticatedRequest, res: Response) {
  const { parent_id, user_id, student_ids, relationship = 'Parent/Guardian' } = req.body;

  // 1. Validation
  const targetParentId = parent_id || user_id;
  if (!targetParentId) {
    return res.status(400).json({ error: 'Target parent identifier (parent_id or user_id) is required.' });
  }

  if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ error: 'Please select at least one student to link.' });
  }

  try {
    // 2. Fetch parent details
    const parentRes = await pglite.query<any>(
      `SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as full_name,
        u.email,
        p.id as parent_id,
        COALESCE(p.phone, '') as phone
       FROM users u
       LEFT JOIN parents p ON u.id = p.user_id
       WHERE u.id = $1 OR p.id = $1
       LIMIT 1;`,
      [targetParentId]
    );

    if (parentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Parent record not found in system.' });
    }

    const parent = parentRes.rows[0];
    const resolvedParentProfileId = parent.parent_id || parent.user_id;
    const resolvedParentUserId = parent.user_id;
    const parentFullName = parent.full_name;
    const parentEmail = parent.email;
    const parentPhone = parent.phone || '+254 700 000000';

    // 3. Verify students existence
    const studentPlaceholders = student_ids.map((_, i) => `$${i + 1}`).join(',');
    const studentsRes = await pglite.query<any>(
      `SELECT id, student_id as student_code, first_name, last_name, grade, section
       FROM students
       WHERE id IN (${studentPlaceholders});`,
      student_ids
    );

    if (studentsRes.rows.length === 0) {
      return res.status(404).json({ error: 'None of the specified student IDs were found in the database.' });
    }

    // 4. Begin atomic transaction to update mappings
    await pglite.query('BEGIN;');

    try {
      const linkedRecords: any[] = [];

      for (const student of studentsRes.rows) {
        // Check if already linked
        const existingLink = await pglite.query<any>(
          `SELECT id FROM parent_students
           WHERE (parent_id = $1 OR parent_user_id = $2) AND student_id = $3
           LIMIT 1;`,
          [resolvedParentProfileId, resolvedParentUserId, student.id]
        );

        if (existingLink.rows.length === 0) {
          const linkId = `ps-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await pglite.query(
            `INSERT INTO parent_students (id, parent_id, parent_user_id, parent_name, parent_email, parent_phone, student_id, relationship)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
            [
              linkId,
              resolvedParentProfileId,
              resolvedParentUserId,
              parentFullName,
              parentEmail,
              parentPhone,
              student.id,
              relationship,
            ]
          );

          linkedRecords.push({
            link_id: linkId,
            student_id: student.id,
            student_code: student.student_code,
            student_name: `${student.first_name} ${student.last_name}`,
            grade: student.grade,
          });
        }
      }

      // Log audit track
      const actorName = req.user?.name || req.user?.email || 'System Administrator';
      await logAuditEntry(pglite, {
        action: 'PARENT_STUDENTS_LINKED',
        entity: 'STUDENT_RELATIONSHIPS',
        actor: actorName,
        details: {
          parent_id: resolvedParentProfileId,
          parent_name: parentFullName,
          parent_email: parentEmail,
          new_links_count: linkedRecords.length,
          total_selected: student_ids.length,
          linked_students: linkedRecords,
          relationship_type: relationship,
          timestamp: new Date().toISOString(),
        },
      });

      await pglite.query('COMMIT;');

      return res.status(200).json({
        success: true,
        message: `Successfully linked ${studentsRes.rows.length} student(s) to parent ${parentFullName}.`,
        parent: {
          id: resolvedParentProfileId,
          user_id: resolvedParentUserId,
          name: parentFullName,
          email: parentEmail,
        },
        linked_students: studentsRes.rows,
        new_links_added: linkedRecords.length,
      });
    } catch (txErr: any) {
      await pglite.query('ROLLBACK;');
      throw txErr;
    }
  } catch (error: any) {
    console.error('Error linking parent to students:', error);
    return res.status(500).json({ error: 'Failed to establish parent-student links.', details: error.message });
  }
}

/**
 * DELETE /api/admin/parents/unlink-student
 * Unlinks a student from a parent relationship.
 */
export async function unlinkParentStudentController(req: AuthenticatedRequest, res: Response) {
  const { parent_id, student_id } = req.body;

  if (!parent_id || !student_id) {
    return res.status(400).json({ error: 'Both parent_id and student_id are required to unlink.' });
  }

  try {
    await pglite.query(
      `DELETE FROM parent_students 
       WHERE (parent_id = $1 OR parent_user_id = $1) AND student_id = $2;`,
      [parent_id, student_id]
    );

    const actorName = req.user?.name || req.user?.email || 'System Administrator';
    await logAuditEntry(pglite, {
      action: 'PARENT_STUDENT_UNLINKED',
      entity: 'STUDENT_RELATIONSHIPS',
      actor: actorName,
      details: {
        parent_id,
        student_id,
        timestamp: new Date().toISOString(),
      },
    });

    return res.json({
      success: true,
      message: 'Student relationship removed successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to unlink relationship.', details: error.message });
  }
}

/**
 * GET /api/parent/dashboard
 * Fetches linked students' attendance and recent academic progress summaries.
 * Accessible ONLY when the session role is 'parent'.
 */
export async function getParentDashboardController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No active user session provided.' });
    }

    // Strict Role Guard: Accessible only when the session role is 'parent'
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        error: `Forbidden: Access restricted. This dashboard is accessible only when the session role is 'parent'. Current role is '${req.user.role}'.`,
        requiredRole: 'parent',
        currentRole: req.user.role,
      });
    }

    const userId = req.user.id;
    const profileId = req.user.profile_id;
    const userEmail = req.user.email;

    // Fetch parent profile metadata
    const parentRes = await pglite.query<any>(
      `SELECT u.id as user_id, u.email, u.first_name, u.last_name, 
              u.first_name || ' ' || u.last_name as full_name,
              p.id as parent_id, p.national_id, p.occupation, COALESCE(p.phone, '') as phone
       FROM users u
       LEFT JOIN parents p ON u.id = p.user_id
       WHERE u.id = $1 OR p.id = $2 OR u.email = $3
       LIMIT 1;`,
      [userId, profileId || userId, userEmail]
    );

    const parent = parentRes.rows[0] || {
      user_id: userId,
      full_name: req.user.name || 'Guardian',
      email: userEmail,
      parent_id: profileId,
      phone: '',
      occupation: '',
    };

    // Query linked students from parent_students table
    const relationsRes = await pglite.query<any>(
      `SELECT 
        ps.id as link_id, 
        ps.relationship, 
        ps.student_id,
        s.id as student_internal_id,
        s.student_id as student_code, 
        s.first_name, 
        s.last_name,
        s.first_name || ' ' || s.last_name as student_name,
        s.grade, 
        s.section, 
        s.email as student_email, 
        s.avatar_url, 
        s.gpa
       FROM parent_students ps
       JOIN students s ON ps.student_id = s.id
       WHERE ps.parent_user_id = $1 
          OR (ps.parent_id IS NOT NULL AND ps.parent_id = $2)
          OR ps.parent_email = $3
       ORDER BY s.first_name ASC;`,
      [userId, parent.parent_id || profileId, userEmail]
    );

    // If for any reason no explicit link row exists for demo parent Carlos Martinez, auto-link Sophia Martinez (s-1)
    let linkedChildrenRows = relationsRes.rows;
    if (linkedChildrenRows.length === 0 && (userEmail === 'carlos.martinez@gmail.com' || userId === 'usr-parent-01')) {
      const sophiaRes = await pglite.query<any>(
        `SELECT id as student_internal_id, student_id as student_code, first_name, last_name,
                first_name || ' ' || last_name as student_name, grade, section, email as student_email, avatar_url, gpa
         FROM students WHERE id = 's-1' OR student_id = 'STU-2024-001' LIMIT 1;`
      );
      if (sophiaRes.rows.length > 0) {
        linkedChildrenRows = [{
          link_id: 'ps-default-01',
          relationship: 'Father',
          student_id: sophiaRes.rows[0].student_internal_id,
          ...sophiaRes.rows[0],
        }];
      }
    }

    // For each linked student, fetch attendance summary, recent attendance logs, and academic progress
    const childrenDetails = await Promise.all(
      linkedChildrenRows.map(async (student) => {
        const studentId = student.student_id || student.student_internal_id;

        // 1. Attendance Summary
        const attSummaryRes = await pglite.query<any>(
          `SELECT 
            COUNT(*) as total_days,
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
            COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days
           FROM attendance
           WHERE student_id = $1;`,
          [studentId]
        );

        // 2. Recent Attendance Logs (ordered descending by date)
        const attLogsRes = await pglite.query<any>(
          `SELECT a.id, a.date, a.status, a.remarks, c.code as class_code, c.title as class_title
           FROM attendance a
           LEFT JOIN classes c ON a.class_id = c.id
           WHERE a.student_id = $1
           ORDER BY a.date DESC
           LIMIT 25;`,
          [studentId]
        );

        // 3. Academic Assessment Results with Subject & Strand Details
        const resultsRes = await pglite.query<any>(
          `SELECT 
            r.id,
            r.raw_score,
            r.percentage,
            r.grade_letter,
            r.cbc_rating,
            r.teacher_comment,
            r.evaluation_system,
            r.created_at,
            a.title as assessment_title,
            a.assessment_type,
            a.max_score,
            a.weightage,
            a.strand_name,
            a.sub_strand,
            s.name as subject_name,
            s.code as subject_code
           FROM results r
           JOIN assessments a ON r.assessment_id = a.id
           JOIN subjects s ON r.subject_id = s.id
           WHERE r.student_id = $1
           ORDER BY r.created_at DESC;`,
          [studentId]
        );

        // 4. Student Fee Account Summary
        const feeRes = await pglite.query<any>(
          `SELECT * FROM student_fee_accounts WHERE student_id = $1 LIMIT 1;`,
          [studentId]
        );

        const totalDays = Number(attSummaryRes.rows[0]?.total_days || 0);
        const presentDays = Number(attSummaryRes.rows[0]?.present_days || 0);
        const absentDays = Number(attSummaryRes.rows[0]?.absent_days || 0);
        const lateDays = Number(attSummaryRes.rows[0]?.late_days || 0);
        
        // Weighted attendance percentage: Present = 1.0, Late = 0.8
        const attendanceRate = totalDays > 0 
          ? Math.min(100, Math.round(((presentDays + lateDays * 0.8) / totalDays) * 100)) 
          : 100;

        // Group results by subject for subject-level academic progress summary
        const subjectMap = new Map<string, { subject_name: string; subject_code: string; scores: number[]; count: number }>();
        for (const resItem of resultsRes.rows) {
          const key = resItem.subject_code || resItem.subject_name;
          const score = Number(resItem.percentage || resItem.raw_score || 0);
          if (!subjectMap.has(key)) {
            subjectMap.set(key, {
              subject_name: resItem.subject_name,
              subject_code: resItem.subject_code,
              scores: [score],
              count: 1,
            });
          } else {
            const entry = subjectMap.get(key)!;
            entry.scores.push(score);
            entry.count += 1;
          }
        }

        const subjectProgress = Array.from(subjectMap.values()).map((sub) => {
          const avg = Math.round(sub.scores.reduce((a, b) => a + b, 0) / sub.scores.length);
          return {
            subject_name: sub.subject_name,
            subject_code: sub.subject_code,
            average_percentage: avg,
            assessments_count: sub.count,
            proficiency_level: avg >= 90 ? 'EE' : avg >= 75 ? 'ME' : avg >= 50 ? 'AE' : 'BE',
          };
        });

        // Overall academic average
        const allScores = resultsRes.rows.map((r: any) => Number(r.percentage || r.raw_score || 0));
        const overallAverage = allScores.length > 0 
          ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length) 
          : 0;

        return {
          id: studentId,
          student_code: student.student_code,
          first_name: student.first_name,
          last_name: student.last_name,
          student_name: student.student_name,
          grade: student.grade,
          section: student.section,
          email: student.student_email,
          avatar_url: student.avatar_url,
          gpa: student.gpa,
          relationship: student.relationship || 'Dependent',
          attendance: {
            total_days: totalDays,
            present_days: presentDays,
            absent_days: absentDays,
            late_days: lateDays,
            attendance_rate: attendanceRate,
            recent_logs: attLogsRes.rows,
          },
          academic_progress: {
            overall_average: overallAverage,
            total_assessments: resultsRes.rows.length,
            cbc_breakdown: {
              EE: resultsRes.rows.filter((r: any) => r.cbc_rating === 'EE').length,
              ME: resultsRes.rows.filter((r: any) => r.cbc_rating === 'ME').length,
              AE: resultsRes.rows.filter((r: any) => r.cbc_rating === 'AE').length,
              BE: resultsRes.rows.filter((r: any) => r.cbc_rating === 'BE').length,
            },
            subject_progress: subjectProgress,
            recent_results: resultsRes.rows,
          },
          fee_account: feeRes.rows[0] || null,
        };
      })
    );

    return res.json({
      success: true,
      parent,
      linked_children: childrenDetails,
    });
  } catch (error: any) {
    console.error('Parent dashboard controller error:', error);
    return res.status(500).json({ error: 'Failed to retrieve parent dashboard data.', details: error.message });
  }
}
