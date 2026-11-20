import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pglite, initDatabase } from './db';
import { isExternalDatabaseEnabled, withDatabaseSchema } from './database';
import { AuthenticatedRequest, AuthenticatedUser, JWT_SECRET } from './authMiddleware';

export function requirePlatformAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'A platform administrator token is required.' });
  }

  try {
    const user = jwt.verify(authHeader.slice('Bearer '.length).trim(), JWT_SECRET) as AuthenticatedUser;
    if (user.role !== 'platform_admin' || user.school_id !== '__platform__') {
      return res.status(403).json({ error: 'Only platform administrators can manage schools.' });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired platform administrator token.' });
  }
}

export async function listSchoolsController(_req: Request, res: Response) {
  try {
    const result = await pglite.query(
      `SELECT s.id, s.name, s.admin_email, s.status, s.created_at,
              a.first_name AS admin_first_name, a.last_name AS admin_last_name
       FROM schools s
       LEFT JOIN platform_school_admins a ON a.school_id = s.id
       ORDER BY s.created_at DESC;`
    );
    return res.json({ success: true, schools: result.rows });
  } catch (error) {
    console.error('[Platform] Failed to list schools:', error);
    return res.status(500).json({ error: 'Unable to load schools.' });
  }
}

export async function createSchoolController(req: Request, res: Response) {
  if (!isExternalDatabaseEnabled) {
    return res.status(503).json({
      error: 'School provisioning requires a persistent PostgreSQL DATABASE_URL.',
    });
  }

  const schoolName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const firstName = typeof req.body.adminFirstName === 'string' ? req.body.adminFirstName.trim() : '';
  const lastName = typeof req.body.adminLastName === 'string' ? req.body.adminLastName.trim() : '';
  const adminEmail =
    typeof req.body.adminEmail === 'string' ? req.body.adminEmail.trim().toLowerCase() : '';
  const adminPassword = typeof req.body.adminPassword === 'string' ? req.body.adminPassword : '';

  if (!schoolName || schoolName.length > 255 || !firstName || !lastName) {
    return res.status(400).json({ error: 'School name and first school-admin name are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || adminEmail.length > 255) {
    return res.status(400).json({ error: 'A valid school-admin email address is required.' });
  }
  if (adminPassword.length < 16 || Buffer.byteLength(adminPassword, 'utf8') > 72) {
    return res.status(400).json({ error: 'The initial school-admin password must be at least 16 characters and no more than 72 bytes.' });
  }

  const existingAdmin = await pglite.query(
    `SELECT email FROM platform_admins WHERE LOWER(email) = $1
     UNION ALL
     SELECT email FROM platform_school_admins WHERE LOWER(email) = $1
     UNION ALL
     SELECT email FROM users WHERE LOWER(email) = $1
     LIMIT 1;`,
    [adminEmail]
  );
  if (existingAdmin.rows.length > 0) {
    return res.status(409).json({ error: 'That email address already belongs to an account.' });
  }

  const schoolId = randomUUID();
  const schoolAdminId = randomUUID();
  const schemaName = `school_${schoolId.replace(/-/g, '')}`;
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  try {
    await pglite.transaction(async (tx) => {
      await tx.query(`CREATE SCHEMA "${schemaName}";`);
      await withDatabaseSchema(schemaName, () => initDatabase({ seed: false }));
      await tx.query(
        `INSERT INTO schools (id, name, admin_email, schema_name, status)
         VALUES ($1, $2, $3, $4, 'active');`,
        [schoolId, schoolName, adminEmail, schemaName]
      );
      await tx.query(
        `INSERT INTO platform_school_admins
           (id, school_id, email, password_hash, first_name, last_name, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active');`,
        [schoolAdminId, schoolId, adminEmail, passwordHash, firstName, lastName]
      );
      await withDatabaseSchema(schemaName, () =>
        pglite.query(
          `INSERT INTO users
             (id, school_id, email, password_hash, first_name, last_name, role, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'admin', 'active');`,
          [schoolAdminId, schoolId, adminEmail, passwordHash, firstName, lastName]
        )
      );
    });

    return res.status(201).json({
      success: true,
      school: {
        id: schoolId,
        name: schoolName,
        status: 'active',
      },
      firstSchoolAdmin: { email: adminEmail, status: 'active' },
      message: `${schoolName} has been provisioned with an isolated workspace. The school administrator can now sign in using the provided email and password.`,
    });
  } catch (error: any) {
    console.error('[Platform] School provisioning failed:', error);
    return res.status(500).json({
      error:
        error?.code === '23505'
          ? 'A school or account with that email already exists.'
          : 'School provisioning failed; no school was activated.',
    });
  }
}
