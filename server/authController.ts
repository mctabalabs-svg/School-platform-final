import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { pglite } from './db';
import { AuthenticatedUser, generateToken } from './authMiddleware';

const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), 10);

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

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password ||
    email.length > 255 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      error: 'Enter a valid email address and password.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const platformAdminRes = await pglite.query<any>(
      `SELECT id, email, password_hash, first_name, last_name
       FROM platform_admins WHERE LOWER(email) = $1 LIMIT 1;`,
      [normalizedEmail]
    );
    if (platformAdminRes.rows.length > 0) {
      const admin = platformAdminRes.rows[0];
      if (!(await bcrypt.compare(String(password), admin.password_hash))) {
        return res.status(401).json({ error: 'Invalid authentication credentials.' });
      }

      const user: AuthenticatedUser = {
        id: admin.id,
        school_id: '__platform__',
        role: 'platform_admin',
        profile_id: admin.id,
        name: `${admin.first_name} ${admin.last_name}`,
        email: admin.email,
      };
      return res.status(200).json({
        success: true,
        message: 'Platform administrator authentication successful.',
        token: generateToken(user),
        user,
      });
    }

    const schoolAdminRes = await pglite.query<any>(
      `SELECT a.id, a.school_id, a.email, a.password_hash, a.first_name, a.last_name, a.status,
              s.name AS school_name, s.status AS school_status
       FROM platform_school_admins a
       JOIN schools s ON s.id = a.school_id
       WHERE LOWER(a.email) = $1 LIMIT 1;`,
      [normalizedEmail]
    );
    if (schoolAdminRes.rows.length > 0) {
      const admin = schoolAdminRes.rows[0];
      if (!(await bcrypt.compare(String(password), admin.password_hash))) {
        return res.status(401).json({ error: 'Invalid authentication credentials.' });
      }
      if (admin.status !== 'active' || admin.school_status !== 'active') {
        return res.status(403).json({
          error: 'This school workspace is not active. Contact your platform administrator.',
        });
      }

      const schoolAdmin: AuthenticatedUser = {
        id: admin.id,
        school_id: admin.school_id,
        role: 'admin',
        profile_id: admin.id,
        name: `${admin.first_name} ${admin.last_name}`,
        email: admin.email,
        school_name: admin.school_name,
      };
      return res.status(200).json({
        success: true,
        message: 'School administrator authentication successful.',
        token: generateToken(schoolAdmin),
        user: {
          ...schoolAdmin,
          first_name: admin.first_name,
          last_name: admin.last_name,
        },
      });
    }

    // 2. Query unified users table
    const userRes = await pglite.query<any>(
      `SELECT id, school_id, email, password_hash, first_name, last_name, role, status
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1;`,
      [normalizedEmail]
    );

    if (userRes.rows.length === 0) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return res.status(401).json({
        error: 'Invalid authentication credentials.',
      });
    }

    const user = userRes.rows[0];

    const isPasswordValid = await bcrypt.compare(String(password), user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid authentication credentials.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'This account is not active. Contact your school administrator.',
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

    const token = generateToken(tokenPayload);

    // 7. Atomic Database Transaction: Audit Log Entry
    // PGlite supports full SQL transaction semantics
    try {
      await pglite.transaction((tx) =>
        logAuditEntry(tx, {
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
        })
      );
    } catch (txError) {
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
    if (req.user.role === 'platform_admin') {
      const adminRes = await pglite.query<any>(
        `SELECT id, email, first_name, last_name
         FROM platform_admins WHERE id = $1 LIMIT 1;`,
        [req.user.id]
      );
      const admin = adminRes.rows[0];
      if (!admin) {
        return res.status(401).json({ error: 'The account for this session is no longer available.' });
      }
      return res.json({
        success: true,
        user: {
          ...admin,
          school_id: '__platform__',
          role: 'platform_admin',
          profile_id: admin.id,
          name: `${admin.first_name} ${admin.last_name}`,
        },
      });
    }

    const userRes = await pglite.query<any>(
      `SELECT id, school_id, email, first_name, last_name, role, status, created_at
       FROM users WHERE id = $1 LIMIT 1;`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'The account for this session is no longer available.' });
    }

    const user = userRes.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account is not active.' });
    }
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
        school_name: req.user.school_name,
      },
    });
  } catch (error: any) {
    console.error('Profile lookup failed:', error);
    return res.status(500).json({ error: 'Unable to verify the current session.' });
  }
}
