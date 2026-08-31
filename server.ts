import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { pglite, qb, initDatabase } from './server/db';
import { authenticateJWT, requireRole, generateToken, AuthenticatedRequest } from './server/authMiddleware';
import { saveAssessmentResultsController } from './server/assessmentController';
import {
  initiateStkPushController,
  mpesaCallbackController,
  getStudentFeeAccountsController,
  getPaymentsHistoryController,
  getPaymentStatusController,
  simulateDarajaCallbackController,
} from './server/paymentController';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser
  app.use(express.json());

  // Initialize DB tables & seed data
  try {
    await initDatabase();
    console.log('[Database] PostgreSQL WASM tables initialized and verified.');
  } catch (err) {
    console.error('[Database] Error initializing database:', err);
  }

  // =========================================================================
  // 1. SAFARICOM M-PESA DARAJA PAYMENTS (DAY 11 REAL-TIME FEE SETTLEMENT)
  // =========================================================================

  /**
   * M-PESA STK PUSH INITIALIZATION
   * Accessible only to authenticated parents / financial admins
   * Generates Bearer token & Password digest, dispatches LipanaM-PesaOnline
   */
  app.post(
    '/api/payments/stk-push',
    authenticateJWT,
    requireRole(['parent', 'super_admin', 'principal', 'accountant']),
    (req: Request, res: Response) => {
      return initiateStkPushController(req as AuthenticatedRequest, res);
    }
  );

  /**
   * UNSECURED M-PESA CALLBACK ENDPOINT
   * Public webhook called asynchronously by Safaricom when user completes PIN entry
   * Validates payload and processes transaction in single atomic DB transaction
   */
  app.post('/api/payments/callback', (req: Request, res: Response) => {
    return mpesaCallbackController(req, res);
  });

  /**
   * Helper payment endpoints for real-time frontend dashboard
   */
  app.get('/api/payments/fee-accounts', (req: Request, res: Response) => {
    return getStudentFeeAccountsController(req, res);
  });

  app.get('/api/payments/history', (req: Request, res: Response) => {
    return getPaymentsHistoryController(req, res);
  });

  app.get('/api/payments/status/:checkoutRequestId', (req: Request, res: Response) => {
    return getPaymentStatusController(req, res);
  });

  app.post('/api/payments/simulate-callback', (req: Request, res: Response) => {
    return simulateDarajaCallbackController(req, res);
  });

  // =========================================================================
  // AUTHENTICATION & TOKEN DEMO (DAY 2 JWT INTEGRATION)
  // =========================================================================
  app.post('/api/auth/demo-token', (req: Request, res: Response) => {
    const userRole = (req.body.role as any) || 'parent';
    const userName = req.body.name || (userRole === 'parent' ? 'Carlos Martinez (Parent)' : 'Dr. Eleanor Vance (Dean of Academics)');
    const token = generateToken({
      id: userRole === 'parent' ? 'usr-parent-01' : 'usr-admin-01',
      name: userName,
      email: userRole === 'parent' ? 'carlos.martinez@gmail.com' : 'e.vance@greenfield.edu',
      role: userRole,
      school_id: 'SCH-KEN-2026-001',
      department: userRole === 'parent' ? undefined : 'Sciences & Curriculum Assessment',
      phone: userRole === 'parent' ? '254708374149' : undefined,
    });

    res.json({
      success: true,
      token,
      user: {
        id: userRole === 'parent' ? 'usr-parent-01' : 'usr-admin-01',
        name: userName,
        email: userRole === 'parent' ? 'carlos.martinez@gmail.com' : 'e.vance@greenfield.edu',
        role: userRole,
        phone: userRole === 'parent' ? '254708374149' : undefined,
      },
    });
  });

  // =========================================================================
  // 1. COMPETENCY-BASED ASSESSMENT CONTROLLER ENDPOINT (DAY 7-8)
  // POST /api/assessments/results (Guarded with JWT Authentication)
  // =========================================================================
  app.post('/api/assessments/results', authenticateJWT, (req: Request, res: Response) => {
    return saveAssessmentResultsController(req as AuthenticatedRequest, res);
  });

  // GET /api/assessments - List assessments for a class and term
  app.get('/api/assessments', async (req: Request, res: Response) => {
    try {
      const { class_id, term_id, subject_id } = req.query;
      let query = 'SELECT a.*, s.name as subject_name, s.code as subject_code FROM assessments a JOIN subjects s ON a.subject_id = s.id WHERE 1=1';
      const params: any[] = [];

      if (class_id) {
        params.push(class_id);
        query += ` AND a.class_id = $${params.length}`;
      }
      if (term_id) {
        params.push(term_id);
        query += ` AND a.term_id = $${params.length}`;
      }
      if (subject_id) {
        params.push(subject_id);
        query += ` AND a.subject_id = $${params.length}`;
      }

      query += ' ORDER BY a.created_at DESC;';
      const result = await pglite.query(query, params);
      res.json({ success: true, count: result.rows.length, assessments: result.rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/assessments/results - Retrieve scores matrix for a specific assessment or class/subject
  app.get('/api/assessments/results', async (req: Request, res: Response) => {
    try {
      const { assessment_id, class_id, subject_id, term_id } = req.query;
      let query = `
        SELECT 
          r.*,
          s.student_id as student_code,
          s.first_name,
          s.last_name,
          s.avatar_url,
          s.grade as student_grade,
          s.section
        FROM results r
        JOIN students s ON r.student_id = s.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (assessment_id) {
        params.push(assessment_id);
        query += ` AND r.assessment_id = $${params.length}`;
      }
      if (class_id) {
        params.push(class_id);
        query += ` AND r.class_id = $${params.length}`;
      }
      if (subject_id) {
        params.push(subject_id);
        query += ` AND r.subject_id = $${params.length}`;
      }
      if (term_id) {
        params.push(term_id);
        query += ` AND r.term_id = $${params.length}`;
      }

      query += ' ORDER BY s.last_name ASC;';
      const result = await pglite.query(query, params);
      res.json({ success: true, count: result.rows.length, results: result.rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/subjects - List all subjects/learning areas
  app.get('/api/subjects', async (_req: Request, res: Response) => {
    try {
      const result = await pglite.query('SELECT * FROM subjects ORDER BY name ASC;');
      res.json({ success: true, subjects: result.rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/assessments/audit-logs - View assessment scoring audit entries
  app.get('/api/assessments/audit-logs', async (_req: Request, res: Response) => {
    try {
      const result = await pglite.query(`
        SELECT * FROM audit_logs
        WHERE entity = 'assessments'
        ORDER BY created_at DESC
        LIMIT 25;
      `);

      const parsedLogs = result.rows.map((log: any) => ({
        ...log,
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
      }));

      res.json({ success: true, logs: parsedLogs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =========================================================================
  // 2. BACKEND BULK ENDPOINT: POST /api/attendance
  // =========================================================================
  /**
   * Accepts payload:
   * {
   *   class_id: string,
   *   term_id: string,
   *   date: string (YYYY-MM-DD),
   *   actor?: string,
   *   records: Array<{ student_id: string, status: 'present' | 'absent' | 'late', remarks?: string }>
   * }
   * 
   * Strict Requirements:
   * - Processes inside a SINGLE database transaction.
   * - Uses UPSERT (on Conflict) with UNIQUE(student_id, date, class_id).
   * - Appends a single row to immutable audit_logs in the same transaction.
   */
  app.post('/api/attendance', async (req: Request, res: Response) => {
    try {
      const { class_id, term_id, date, records, actor } = req.body;

      // 1. Validate payload structure
      if (!class_id || typeof class_id !== 'string') {
        return res.status(400).json({
          error: 'Validation failed: "class_id" is required and must be a string.',
        });
      }

      if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          error: 'Validation failed: "date" must be formatted as YYYY-MM-DD.',
        });
      }

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          error: 'Validation failed: "records" must be a non-empty array of student attendance items.',
        });
      }

      const validStatuses = new Set(['present', 'absent', 'late']);
      for (let i = 0; i < records.length; i++) {
        const item = records[i];
        if (!item.student_id || typeof item.student_id !== 'string') {
          return res.status(400).json({
            error: `Validation failed at index ${i}: "student_id" is required.`,
          });
        }
        if (!validStatuses.has(item.status)) {
          return res.status(400).json({
            error: `Validation failed at index ${i}: "status" must be one of: 'present', 'absent', 'late'. Received '${item.status}'.`,
          });
        }
      }

      const activeTermId = term_id || 'term-fall-2025';
      const actorName = actor || 'Faculty Instructor (Automated Session)';

      // 2. Process inside a SINGLE atomic database transaction
      const transactionResult = await pglite.transaction(async (tx) => {
        const nowIso = new Date().toISOString();

        // Perform UPSERT on conflict (student_id, date, class_id) for each student record
        for (const record of records) {
          const rowId = `${class_id}_${record.student_id}_${date}`;
          const status = record.status;
          const remarks = record.remarks || '';

          await tx.query(
            `
            INSERT INTO attendance (id, student_id, class_id, term_id, date, status, remarks, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (student_id, date, class_id)
            DO UPDATE SET
              status = EXCLUDED.status,
              remarks = EXCLUDED.remarks,
              updated_at = EXCLUDED.updated_at;
            `,
            [rowId, record.student_id, class_id, activeTermId, date, status, remarks, nowIso, nowIso]
          );
        }

        // Calculate breakdown metrics
        const breakdown = {
          present: records.filter((r) => r.status === 'present').length,
          absent: records.filter((r) => r.status === 'absent').length,
          late: records.filter((r) => r.status === 'late').length,
        };

        // Append a single immutable audit log entry in the EXACT same transaction
        const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const auditDetails = JSON.stringify({
          event: 'BULK_ATTENDANCE_RECORDED',
          class_id,
          date,
          term_id: activeTermId,
          total_roster_size: records.length,
          breakdown,
          affected_student_ids: records.map((r) => r.student_id),
          client_ip: req.ip || '127.0.0.1',
        });

        await tx.query(
          `
          INSERT INTO audit_logs (id, action, entity, class_id, term_id, date, actor, details, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
          `,
          [auditId, 'BULK_ATTENDANCE_UPSERT', 'attendance', class_id, activeTermId, date, actorName, auditDetails, nowIso]
        );

        return {
          audit_log_id: auditId,
          records_upserted: records.length,
          breakdown,
          date,
          class_id,
          timestamp: nowIso,
        };
      });

      return res.status(200).json({
        success: true,
        message: `Successfully processed bulk attendance for ${records.length} students.`,
        data: transactionResult,
      });
    } catch (error: any) {
      console.error('[Attendance POST Error]:', error);
      return res.status(500).json({
        error: 'Database transaction failed while processing bulk attendance.',
        details: error.message || String(error),
      });
    }
  });

  // =========================================================================
  // 2. HELPER API ENDPOINTS FOR ROSTER & DATA
  // =========================================================================

  // GET /api/classes - List all classes with student count
  app.get('/api/classes', async (_req: Request, res: Response) => {
    try {
      const result = await pglite.query(`
        SELECT 
          c.*,
          (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) as enrolled_count
        FROM classes c
        ORDER BY c.code ASC;
      `);

      res.json({ success: true, classes: result.rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/classes/:class_id/students - Fetch student roster for selected class
  app.get('/api/classes/:class_id/students', async (req: Request, res: Response) => {
    try {
      const { class_id } = req.params;

      const result = await pglite.query(
        `
        SELECT 
          s.id,
          s.student_id,
          s.first_name,
          s.last_name,
          s.grade,
          s.section,
          s.email,
          s.guardian_name,
          s.guardian_phone,
          s.avatar_url,
          s.gpa
        FROM students s
        INNER JOIN enrollments e ON s.id = e.student_id
        WHERE e.class_id = $1
        ORDER BY s.last_name ASC;
      `,
        [class_id]
      );

      let studentsList = result.rows;
      if (studentsList.length === 0) {
        const fallback = await pglite.query('SELECT * FROM students LIMIT 8;');
        studentsList = fallback.rows;
      }

      res.json({ success: true, count: studentsList.length, students: studentsList });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/attendance - Fetch existing attendance for a class on a date
  app.get('/api/attendance', async (req: Request, res: Response) => {
    try {
      const { class_id, date } = req.query;

      if (!class_id || !date) {
        return res.status(400).json({ error: 'class_id and date query parameters are required' });
      }

      const result = await pglite.query(
        `
        SELECT * FROM attendance
        WHERE class_id = $1 AND date = $2
        ORDER BY student_id ASC;
      `,
        [String(class_id), String(date)]
      );

      res.json({ success: true, count: result.rows.length, records: result.rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/attendance/audit-logs - View immutable audit logs
  app.get('/api/attendance/audit-logs', async (_req: Request, res: Response) => {
    try {
      const result = await pglite.query(`
        SELECT * FROM audit_logs
        WHERE entity = 'attendance'
        ORDER BY created_at DESC
        LIMIT 20;
      `);

      const parsedLogs = result.rows.map((log: any) => ({
        ...log,
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
      }));

      res.json({ success: true, logs: parsedLogs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/terms - Active Terms
  app.get('/api/terms', async (_req: Request, res: Response) => {
    try {
      const result = await pglite.query('SELECT * FROM terms ORDER BY is_active DESC;');
      res.json({ success: true, terms: result.rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', database: 'PostgreSQL WASM (Transaction & UPSERT ready)' });
  });

  // =========================================================================
  // 3. VITE MIDDLEWARE SETUP
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Greenfield Academy Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
