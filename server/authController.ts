import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pglite } from './db';
import { JWT_SECRET, AuthenticatedUser } from './authMiddleware';

/**
 * Audit log helper that writes an immutable access record to the audit_logs table.
 * If a transaction query runner is provided, executes within that transaction.
 */
export async function logAuditEntry(
  clientOrDb: { query: (sql: string, params?: any[]) => Promise<any> },
  entry: {
    action: string;
    entity: string;
    actor: string;
    details: Record<string, any> | string;
    classId?: string;
    termId?: string;
    subjectId?: string;
    date?: string;
  }
) {
  const auditId = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const detailsStr = typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details);
  const dateStr = entry.date || new Date().toISOString().split('T')[0];

  await clientOrDb.query(
    `INSERT INTO audit_logs (id, action, entity, class_id, term_id, subject_id, date, actor, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
    [
      auditId,
      entry.action,
      entry.entity,
      entry.classId || null,
      entry.termId || null,
      entry.subjectId || null,
      dateStr,
      entry.actor,
      detailsStr,
    ]
  );
  return auditId;
}

/**
 * 1. LOGIN CONTROLLER FUNCTION (POST /api/auth/login)
 * 
 * - Accepts email and password from request body
 * - Queries unified users table for existence and checks status === 'active'
 * - Uses bcrypt to securely compare incoming password with password_hash
 * - Role-Specific Profile Matching: queries secondary profile tables ('teachers', 'parents', 'students')
 *   using the foreign key user_id to extract unique profile_id
 * - Issues stateful JWT access token containing { id, school_id, role, profile_id }
 * - Within a database transaction block, logs a successful access audit track row
 */
export async function loginController(req: Request, res: Response) {
  const { email, password } = req.body;

  // 1. Validate input completeness
  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing required credentials. Both "email" and "password" are required.',
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    // 2. Query unified users table
    const userRes = await pglite.query<any>(
      `SELECT id, school_id, email, password_hash, first_name, last_name, role, status
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1;`,
      [normalizedEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid authentication credentials. User does not exist.',
      });
    }

    const user = userRes.rows[0];

    // 3. Verify user status
    if (user.status !== 'active') {
      return res.status(403).json({
        error: `Account is currently ${user.status}. Please contact the school administrator.`,
      });
    }

    // 4. Secure bcrypt password verification
    const isPasswordValid = await bcrypt.compare(String(password), user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid authentication credentials. Incorrect password.',
      });
    }

    // 5. Role-Specific Secondary Profile ID Extraction
    let profileId: string | null = null;
    let profileMetadata: Record<string, any> = {};

    if (user.role === 'teacher') {
      const teacherRes = await pglite.query<any>(
        `SELECT id, staff_id, specialization, department, phone
         FROM teachers
         WHERE user_id = $1
         LIMIT 1;`,
        [user.id]
      );
      if (teacherRes.rows.length > 0) {
        profileId = teacherRes.rows[0].id;
        profileMetadata = teacherRes.rows[0];
      }
    } else if (user.role === 'parent') {
      const parentRes = await pglite.query<any>(
        `SELECT id, national_id, occupation, phone
         FROM parents
         WHERE user_id = $1
         LIMIT 1;`,
        [user.id]
      );
      if (parentRes.rows.length > 0) {
        profileId = parentRes.rows[0].id;
        profileMetadata = parentRes.rows[0];
      }
    } else if (user.role === 'student') {
      const studentRes = await pglite.query<any>(
        `SELECT id, student_id, grade, section, gpa, avatar_url
         FROM students
         WHERE user_id = $1 OR LOWER(email) = $2
         LIMIT 1;`,
        [user.id, normalizedEmail]
      );
      if (studentRes.rows.length > 0) {
        profileId = studentRes.rows[0].id;
        profileMetadata = studentRes.rows[0];
      }
    } else {
      // For admin / principal / accountant
      profileId = user.id;
    }

    // 6. Sign and issue JWT access token
    const tokenPayload: AuthenticatedUser = {
      id: user.id,
      school_id: user.school_id,
      role: user.role,
      profile_id: profileId,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '7d',
      algorithm: 'HS256',
    });

    // 7. Atomic Database Transaction: Audit Log Entry
    // PGlite supports full SQL transaction semantics
    await pglite.query('BEGIN;');
    try {
      await logAuditEntry(pglite, {
        action: 'USER_LOGIN_SUCCESS',
        entity: 'AUTH',
        actor: `${user.first_name} ${user.last_name} (${user.email})`,
        details: {
          user_id: user.id,
          role: user.role,
          school_id: user.school_id,
          profile_id: profileId,
          ip_address: req.ip || req.socket.remoteAddress,
          user_agent: req.headers['user-agent'] || 'Unknown Client',
          timestamp: new Date().toISOString(),
        },
      });
      await pglite.query('COMMIT;');
    } catch (txError) {
      await pglite.query('ROLLBACK;');
      console.error('Audit log transaction error during login:', txError);
      // Proceed with login even if non-critical audit log had issue, but report
    }

    // 8. Return formatted authenticated response
    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user.id,
        school_id: user.school_id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        profile_id: profileId,
        profile: profileMetadata,
      },
    });
  } catch (error: any) {
    console.error('Login controller execution error:', error);
    return res.status(500).json({
      error: 'Internal server error during authentication processing.',
      details: error.message,
    });
  }
}

/**
 * Helper to fetch current authenticated user profile
 */
export async function getProfileController(req: Request & { user?: AuthenticatedUser }, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: No active session.' });
  }

  try {
    const userRes = await pglite.query<any>(
      `SELECT id, school_id, email, first_name, last_name, role, status, created_at
       FROM users WHERE id = $1 LIMIT 1;`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const user = userRes.rows[0];
    let profileData: any = null;

    if (user.role === 'teacher' && req.user.profile_id) {
      const tRes = await pglite.query('SELECT * FROM teachers WHERE id = $1 LIMIT 1;', [req.user.profile_id]);
      profileData = tRes.rows[0] || null;
    } else if (user.role === 'parent' && req.user.profile_id) {
      const pRes = await pglite.query('SELECT * FROM parents WHERE id = $1 LIMIT 1;', [req.user.profile_id]);
      const childrenRes = await pglite.query(
        `SELECT s.*, ps.relationship 
         FROM parent_students ps
         JOIN students s ON ps.student_id = s.id
         WHERE ps.parent_id = $1 OR ps.parent_user_id = $2;`,
        [req.user.profile_id, user.id]
      );
      const parentObj = (pRes.rows[0] as Record<string, any>) || {};
      profileData = {
        ...parentObj,
        linked_children: childrenRes.rows,
      };
    } else if (user.role === 'student' && req.user.profile_id) {
      const sRes = await pglite.query('SELECT * FROM students WHERE id = $1 LIMIT 1;', [req.user.profile_id]);
      profileData = sRes.rows[0] || null;
    }

    return res.json({
      success: true,
      user: {
        ...user,
        profile_id: req.user.profile_id,
        profile: profileData,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
