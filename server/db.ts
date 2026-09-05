import { PGlite } from '@electric-sql/pglite';
import knex from 'knex';
import bcrypt from 'bcryptjs';
import path from 'path';

// Knex Query Builder instance with PostgreSQL dialect
export const qb = knex({
  client: 'pg',
});

// PGlite instance (WASM PostgreSQL with ACID transactions and ON CONFLICT support)
export const pglite = new PGlite();

export interface DBTransaction {
  query: (sql: string, params?: any[]) => Promise<any>;
}

/**
 * Initializes tables with PostgreSQL strict schemas:
 * - attendance table with UNIQUE(student_id, date, class_id)
 * - audit_logs table (immutable ledger)
 * - classes, students, enrollments, terms tables
 */
export async function initDatabase(): Promise<void> {
  // 1. Terms Table
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS terms (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      academic_year VARCHAR(64) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Classes Table
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS classes (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      grade VARCHAR(64) NOT NULL,
      instructor VARCHAR(255) NOT NULL,
      room VARCHAR(64) NOT NULL,
      schedule VARCHAR(255) NOT NULL,
      capacity INT DEFAULT 30,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Students Table
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(64) PRIMARY KEY,
      student_id VARCHAR(64) NOT NULL UNIQUE,
      first_name VARCHAR(128) NOT NULL,
      last_name VARCHAR(128) NOT NULL,
      grade VARCHAR(64) NOT NULL,
      section VARCHAR(128) NOT NULL,
      email VARCHAR(255) NOT NULL,
      guardian_name VARCHAR(255),
      guardian_phone VARCHAR(64),
      avatar_url TEXT,
      gpa NUMERIC(3,2) DEFAULT 4.0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Enrollments Table
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id VARCHAR(64) PRIMARY KEY,
      class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_class_student UNIQUE (class_id, student_id)
    );
  `);

  // 5. Attendance Table with UNIQUE (student_id, date, class_id)
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id VARCHAR(128) PRIMARY KEY,
      student_id VARCHAR(64) NOT NULL,
      class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      term_id VARCHAR(64) NOT NULL,
      date VARCHAR(10) NOT NULL,
      status VARCHAR(16) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_student_date_class UNIQUE (student_id, date, class_id)
    );
  `);

  // 6. Subjects / Learning Areas Table
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS subjects (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      department VARCHAR(128) NOT NULL,
      curriculum_type VARCHAR(32) DEFAULT 'both' CHECK (curriculum_type IN ('numeric', 'cbc', 'both')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. Assessments (Continuous Assessments, Rubrics, Exams, Strand Tasks)
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS assessments (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      term_id VARCHAR(64) NOT NULL,
      assessment_type VARCHAR(64) NOT NULL,
      evaluation_system VARCHAR(32) NOT NULL CHECK (evaluation_system IN ('numeric', 'cbc')),
      max_score NUMERIC(5,2) DEFAULT 100.00,
      weightage NUMERIC(5,2) DEFAULT 30.00,
      strand_name VARCHAR(255),
      sub_strand VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. Results / Evaluation Scores Table with strict UNIQUE(assessment_id, student_id, term_id)
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS results (
      id VARCHAR(128) PRIMARY KEY,
      assessment_id VARCHAR(64) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      term_id VARCHAR(64) NOT NULL,
      evaluation_system VARCHAR(32) NOT NULL CHECK (evaluation_system IN ('numeric', 'cbc')),
      raw_score NUMERIC(5,2),
      percentage NUMERIC(5,2),
      grade_letter VARCHAR(8),
      cbc_rating VARCHAR(8) CHECK (cbc_rating IN ('EE', 'ME', 'AE', 'BE', NULL)),
      teacher_comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_student_assessment UNIQUE (assessment_id, student_id, term_id)
    );
  `);

  // 9. Audit Logs Table (immutable append-only table)
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(128) PRIMARY KEY,
      action VARCHAR(128) NOT NULL,
      entity VARCHAR(64) NOT NULL,
      class_id VARCHAR(64),
      term_id VARCHAR(64),
      subject_id VARCHAR(64),
      date VARCHAR(10),
      actor VARCHAR(255) NOT NULL,
      details TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10. Student Fee Accounts & Invoices Table (Day 11 Real-Time Payments)
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS student_fee_accounts (
      id VARCHAR(64) PRIMARY KEY,
      student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      term_id VARCHAR(64) NOT NULL,
      account_number VARCHAR(64) UNIQUE NOT NULL,
      fee_structure_name VARCHAR(128) DEFAULT 'Standard Term Tuition & STEM Labs',
      total_billed NUMERIC(10,2) NOT NULL DEFAULT 45000.00,
      amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
      balance NUMERIC(10,2) NOT NULL DEFAULT 45000.00,
      status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'CLEARED', 'OVERPAID')),
      due_date VARCHAR(10),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_student_term_fee UNIQUE (student_id, term_id)
    );
  `);

  // 11. Payments Tracking Table (M-Pesa Daraja STK Push & Callbacks)
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(128) PRIMARY KEY,
      checkout_request_id VARCHAR(128) UNIQUE NOT NULL,
      merchant_request_id VARCHAR(128),
      student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      parent_id VARCHAR(64),
      parent_phone VARCHAR(20) NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      mpesa_receipt_number VARCHAR(64) UNIQUE,
      transaction_date VARCHAR(32),
      status VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
      result_code INTEGER,
      result_desc TEXT,
      raw_callback_payload TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 12. Users Table (Unified Authentication & RBAC)
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      school_id VARCHAR(64) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(128) NOT NULL,
      last_name VARCHAR(128) NOT NULL,
      role VARCHAR(64) NOT NULL CHECK (role IN ('admin', 'super_admin', 'principal', 'teacher', 'parent', 'student', 'accountant')),
      status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'inactive')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 13. Teachers Profile Table
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      staff_id VARCHAR(64) UNIQUE NOT NULL,
      specialization VARCHAR(255),
      department VARCHAR(128),
      phone VARCHAR(64),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 14. Parents Profile Table
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS parents (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      national_id VARCHAR(64),
      occupation VARCHAR(128),
      phone VARCHAR(64),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure user_id column exists on students
  try {
    await pglite.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id VARCHAR(64);`);
  } catch (e) {
    // Ignore if column exists
  }

  // 15. Teacher Subject & Class Assignments Table (for ownership & marking authorizations)
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id VARCHAR(64) PRIMARY KEY,
      teacher_id VARCHAR(64) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      academic_year VARCHAR(64) DEFAULT '2025-2026',
      term_id VARCHAR(64) DEFAULT 'term-fall-2025',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_teacher_class_subject UNIQUE (teacher_id, class_id, subject_id, term_id)
    );
  `);

  // 16. Parent & Student Relationship Mapping Table
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS parent_students (
      id VARCHAR(64) PRIMARY KEY,
      parent_id VARCHAR(64),
      parent_user_id VARCHAR(64) NOT NULL,
      parent_name VARCHAR(255) NOT NULL,
      parent_email VARCHAR(255) NOT NULL,
      parent_phone VARCHAR(20) NOT NULL,
      student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      relationship VARCHAR(64) DEFAULT 'Parent/Guardian'
    );
  `);

  // 17. Assignment Submissions Table
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id VARCHAR(64) PRIMARY KEY,
      assessment_id VARCHAR(64) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      submission_text TEXT,
      file_name VARCHAR(255),
      file_size VARCHAR(64),
      file_url TEXT,
      attachment_type VARCHAR(64),
      external_link TEXT,
      comments TEXT,
      status VARCHAR(32) DEFAULT 'submitted',
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_student_submission UNIQUE (assessment_id, student_id)
    );
  `);

  // Ensure due_date and instructions columns exist on assessments
  try {
    await pglite.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS due_date VARCHAR(64);`);
    await pglite.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS instructions TEXT;`);
  } catch (e) {
    // Ignore if column exists
  }

  // Migration helper for audit_logs if subject_id column didn't exist in early migration
  try {
    await pglite.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS subject_id VARCHAR(64);`);
  } catch (e) {
    // Ignore if column exists
  }

  // Seed default data if database is empty
  await seedInitialData();

  // Ensure subjects and assessments seed rows exist even if terms was already seeded in previous runs
  await seedSubjectsAndAssessments();

  // Ensure fee accounts, parents, users, and teacher assignments exist
  await seedFeeAccountsAndParents();
  await seedUsersAndProfiles();
}

async function seedFeeAccountsAndParents() {
  try {
    const feeRes = await pglite.query<{ count: string }>('SELECT COUNT(*) as count FROM student_fee_accounts');
    if (Number(feeRes.rows[0]?.count || 0) === 0) {
      const feeAccounts = [
        ['fee-s1', 's-1', 'term-fall-2025', 'ACC-STU-001', 'Tuition & STEM Practical Fee', 45000.00, 20000.00, 25000.00, 'PARTIAL', '2026-09-15'],
        ['fee-s2', 's-2', 'term-fall-2025', 'ACC-STU-002', 'Full Boarding & Honors Program', 55000.00, 55000.00, 0.00, 'CLEARED', '2026-09-15'],
        ['fee-s3', 's-3', 'term-fall-2025', 'ACC-STU-003', 'Tuition & Arts Studio Materials', 42000.00, 10000.00, 32000.00, 'PARTIAL', '2026-09-15'],
        ['fee-s4', 's-4', 'term-fall-2025', 'ACC-STU-004', 'Tuition & Senior STEM Labs', 45000.00, 0.00, 45000.00, 'PENDING', '2026-09-15'],
        ['fee-s5', 's-5', 'term-fall-2025', 'ACC-STU-005', 'Standard Tuition Fee', 38000.00, 38000.00, 0.00, 'CLEARED', '2026-09-15'],
        ['fee-s6', 's-6', 'term-fall-2025', 'ACC-STU-006', 'Tuition & Humanities Seminar Fee', 40000.00, 15000.00, 25000.00, 'PARTIAL', '2026-09-15'],
        ['fee-s7', 's-7', 'term-fall-2025', 'ACC-STU-007', 'Tuition & Biology Lab Practical', 43000.00, 0.00, 43000.00, 'PENDING', '2026-09-15'],
        ['fee-s8', 's-8', 'term-fall-2025', 'ACC-STU-008', 'Tuition & STEM Practical Fee', 45000.00, 45000.00, 0.00, 'CLEARED', '2026-09-15'],
        ['fee-s9', 's-9', 'term-fall-2025', 'ACC-STU-009', 'Full Boarding & Honors Program', 55000.00, 25000.00, 30000.00, 'PARTIAL', '2026-09-15'],
        ['fee-s10', 's-10', 'term-fall-2025', 'ACC-STU-010', 'Tuition & Computer Science Labs', 44000.00, 0.00, 44000.00, 'PENDING', '2026-09-15'],
      ];

      for (const fa of feeAccounts) {
        await pglite.query(
          `INSERT INTO student_fee_accounts (id, student_id, term_id, account_number, fee_structure_name, total_billed, amount_paid, balance, status, due_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
          fa
        );
      }

      // Parent to Student mapping (e.g. Carlos Martinez is parent of Sophia Martinez s-1)
      const parents = [
        ['ps-1', 'usr-parent-01', 'Carlos Martinez', 'carlos.martinez@gmail.com', '254708374149', 's-1', 'Father'],
        ['ps-2', 'usr-parent-02', 'Li Wei Chen', 'li.chen@outlook.com', '254712345678', 's-2', 'Mother'],
        ['ps-3', 'usr-parent-03', 'Sean O\'Connor', 'sean.oconnor@gmail.com', '254722998877', 's-4', 'Father'],
      ];

      for (const p of parents) {
        await pglite.query(
          `INSERT INTO parent_students (id, parent_user_id, parent_name, parent_email, parent_phone, student_id, relationship)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          p
        );
      }

      // Seed sample completed initial M-Pesa payments for history
      const initialPayments = [
        ['pay-init-01', 'ws_CO_240820251200001', '29115-3462001-1', 's-1', 'usr-parent-01', '254708374149', 20000.00, 'QK98XCV101', '20260820120000', 'COMPLETED', 0, 'The service request is processed successfully.'],
        ['pay-init-02', 'ws_CO_240820251200002', '29115-3462002-1', 's-2', 'usr-parent-02', '254712345678', 55000.00, 'QK99ABZ202', '20260821093000', 'COMPLETED', 0, 'The service request is processed successfully.'],
        ['pay-init-03', 'ws_CO_240820251200003', '29115-3462003-1', 's-3', 'usr-parent-03', '254722998877', 10000.00, 'QK99PLM303', '20260822141500', 'COMPLETED', 0, 'The service request is processed successfully.'],
      ];

      for (const pay of initialPayments) {
        await pglite.query(
          `INSERT INTO payments (id, checkout_request_id, merchant_request_id, student_id, parent_id, parent_phone, amount, mpesa_receipt_number, transaction_date, status, result_code, result_desc)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
          pay
        );
      }
    }
  } catch (err) {
    console.error('Error seeding fee accounts and parents:', err);
  }
}

async function seedSubjectsAndAssessments() {
  const subRes = await pglite.query<{ count: string }>('SELECT COUNT(*) as count FROM subjects');
  if (Number(subRes.rows[0]?.count || 0) === 0) {
    await pglite.query(`
      INSERT INTO subjects (id, code, name, department, curriculum_type) VALUES
      ('sub-phy', 'PHY-101', 'Physics & Physical Science', 'Sciences', 'both'),
      ('sub-math', 'MATH-201', 'Integrated Mathematics', 'Mathematics', 'both'),
      ('sub-cs', 'CS-101', 'Computer Science & Computational Thinking', 'Technology', 'both'),
      ('sub-eng', 'ENG-101', 'English Language & Literary Arts', 'Languages', 'both'),
      ('sub-agr', 'AGR-101', 'Agriculture & Environmental Nutrition', 'Applied Sciences', 'cbc'),
      ('sub-kis', 'KIS-101', 'Kiswahili na Mawasiliano', 'Languages', 'both')
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  const asmRes = await pglite.query<{ count: string }>('SELECT COUNT(*) as count FROM assessments');
  if (Number(asmRes.rows[0]?.count || 0) === 0) {
    await pglite.query(`
      INSERT INTO assessments (id, title, class_id, subject_id, term_id, assessment_type, evaluation_system, max_score, weightage, strand_name, sub_strand, due_date, instructions) VALUES
      ('asm-1', 'Mechanics & Dynamics CAT 1', 'c-1', 'sub-phy', 'term-fall-2025', 'CAT_1', 'numeric', 100.00, 20.00, 'Classical Mechanics', 'Newtonian Laws', '2026-09-12', 'Complete the Newtonian mechanics problem set showing all free-body diagrams, tensor equations, and dimensional checks.'),
      ('asm-2', 'Kinematics & Vectors Practical', 'c-1', 'sub-phy', 'term-fall-2025', 'STRAND_EVALUATION', 'cbc', 100.00, 30.00, 'Physical Sciences & Experimentation', 'Measurement & Precision Lab', '2026-09-15', 'Submit the comprehensive laboratory report on velocity vectors and kinematic acceleration curves, including uncertainty calculations.'),
      ('asm-3', 'Algorithm Design & Trees Assessment', 'c-2', 'sub-cs', 'term-fall-2025', 'CAT_1', 'numeric', 100.00, 25.00, 'Computing & Logic', 'Graph Theory & Data Structures', '2026-09-10', 'Implement binary search trees, AVL rebalancing, and graph traversal algorithms in Python or TypeScript with unit tests.'),
      ('asm-4', 'Computational Problem Solving Task', 'c-2', 'sub-cs', 'term-fall-2025', 'STRAND_EVALUATION', 'cbc', 100.00, 35.00, 'Digital Literacy & Innovation', 'Software System Design', '2026-09-18', 'Produce a detailed software architectural specification for a distributed school portal microservice with class diagrams.'),
      ('asm-5', 'Rotational Dynamics & Torque Problem Set', 'c-1', 'sub-phy', 'term-fall-2025', 'HOMEWORK', 'numeric', 50.00, 15.00, 'Rotational Mechanics', 'Angular Momentum & Inertia', '2026-09-20', 'Solve analytical torque problems for spinning disc systems and gyroscopic precessions with complete mathematical proofs.'),
      ('asm-6', 'Dynamic Programming & Memoization Lab Task', 'c-2', 'sub-cs', 'term-fall-2025', 'PRACTICAL_TASK', 'cbc', 50.00, 20.00, 'Algorithmic Optimization', 'Recursion & Memoization', '2026-09-22', 'Construct an optimal solution for the 0/1 Knapsack problem with dynamic programming matrix tabulation and asymptotic runtime analysis.')
      ON CONFLICT (id) DO NOTHING;
    `);
  } else {
    // Ensure due_date and instructions are populated for existing rows
    await pglite.query(`
      UPDATE assessments SET 
        due_date = COALESCE(due_date, '2026-09-15'),
        instructions = COALESCE(instructions, 'Complete the assigned exercises and submit your solution documentation before the deadline.')
      WHERE due_date IS NULL OR instructions IS NULL;
    `);

    // Insert asm-5 and asm-6 if not yet created
    await pglite.query(`
      INSERT INTO assessments (id, title, class_id, subject_id, term_id, assessment_type, evaluation_system, max_score, weightage, strand_name, sub_strand, due_date, instructions) VALUES
      ('asm-5', 'Rotational Dynamics & Torque Problem Set', 'c-1', 'sub-phy', 'term-fall-2025', 'HOMEWORK', 'numeric', 50.00, 15.00, 'Rotational Mechanics', 'Angular Momentum & Inertia', '2026-09-20', 'Solve analytical torque problems for spinning disc systems and gyroscopic precessions with complete mathematical proofs.'),
      ('asm-6', 'Dynamic Programming & Memoization Lab Task', 'c-2', 'sub-cs', 'term-fall-2025', 'PRACTICAL_TASK', 'cbc', 50.00, 20.00, 'Algorithmic Optimization', 'Recursion & Memoization', '2026-09-22', 'Construct an optimal solution for the 0/1 Knapsack problem with dynamic programming matrix tabulation and asymptotic runtime analysis.')
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // Seed sample assignment submissions
  const subCountRes = await pglite.query<{ count: string }>('SELECT COUNT(*) as count FROM assignment_submissions');
  if (Number(subCountRes.rows[0]?.count || 0) === 0) {
    await pglite.query(`
      INSERT INTO assignment_submissions (id, assessment_id, student_id, submission_text, file_name, file_size, external_link, comments, status) VALUES
      ('sub-1', 'asm-1', 's-1', 'Detailed solutions to mechanics CAT 1 including tension vector calculations and free-body graphs.', 'Sophia_Martinez_Mechanics_CAT1.pdf', '1.8 MB', 'https://github.com/greenfield-stem/mechanics-solutions', 'Completed all 5 core questions and the bonus derivation.', 'graded'),
      ('sub-2', 'asm-3', 's-1', 'Implemented BinarySearchTree with AVL rebalancing rotations and Dijkstra shortest path traversal algorithm.', 'sophia_algorithms_trees.ts', '45 KB', 'https://github.com/sophia-martinez/algorithms-trees', 'All unit test assertions passed successfully in ts-node test suite.', 'graded')
      ON CONFLICT (assessment_id, student_id) DO NOTHING;
    `);
  }

  // Seed initial results if empty
  const resultsCountRes = await pglite.query<{ count: string }>('SELECT COUNT(*) as count FROM results');
  if (Number(resultsCountRes.rows[0]?.count || 0) === 0) {
    await pglite.query(`
      INSERT INTO results (id, assessment_id, student_id, class_id, subject_id, term_id, evaluation_system, raw_score, percentage, grade_letter, cbc_rating, teacher_comment) VALUES
      ('res-1', 'asm-1', 's-1', 'c-1', 'sub-phy', 'term-fall-2025', 'numeric', 94.00, 94.00, 'A', 'EE', 'Exceptional grasp of kinematic vectors and theoretical principles.'),
      ('res-2', 'asm-2', 's-1', 'c-1', 'sub-phy', 'term-fall-2025', 'cbc', 92.00, 92.00, 'A', 'EE', 'Demonstrates rigorous lab precision and creative analytical problem-solving.'),
      ('res-3', 'asm-3', 's-1', 'c-2', 'sub-cs', 'term-fall-2025', 'numeric', 96.00, 96.00, 'A', 'EE', 'Flawless algorithmic design and optimal time-complexity analyses.'),
      ('res-4', 'asm-4', 's-1', 'c-2', 'sub-cs', 'term-fall-2025', 'cbc', 90.00, 90.00, 'A', 'EE', 'High innovation in systems architecture and modular code design.'),

      ('res-5', 'asm-1', 's-2', 'c-1', 'sub-phy', 'term-fall-2025', 'numeric', 98.00, 98.00, 'A', 'EE', 'Mastery in advanced mechanics and calculus-based modeling.'),
      ('res-6', 'asm-2', 's-2', 'c-1', 'sub-phy', 'term-fall-2025', 'cbc', 95.00, 95.00, 'A', 'EE', 'Exemplary leadership during collaborative experimental setups.'),

      ('res-7', 'asm-1', 's-4', 'c-1', 'sub-phy', 'term-fall-2025', 'numeric', 78.00, 78.00, 'B+', 'ME', 'Steady improvement; recommended practice in rotational dynamics.'),
      ('res-8', 'asm-2', 's-4', 'c-1', 'sub-phy', 'term-fall-2025', 'cbc', 82.00, 82.00, 'A-', 'ME', 'Good laboratory rigor; detailed observational summaries.')
      ON CONFLICT (assessment_id, student_id, term_id) DO NOTHING;
    `);
  }

  // Seed initial attendance entries for Sophia Martinez (s-1) if empty
  const attCountRes = await pglite.query<{ count: string }>('SELECT COUNT(*) as count FROM attendance');
  if (Number(attCountRes.rows[0]?.count || 0) === 0) {
    await pglite.query(`
      INSERT INTO attendance (id, student_id, class_id, term_id, date, status, remarks) VALUES
      ('att-s1-01', 's-1', 'c-1', 'term-fall-2025', '2026-08-20', 'present', 'On time'),
      ('att-s1-02', 's-1', 'c-1', 'term-fall-2025', '2026-08-21', 'present', 'On time'),
      ('att-s1-03', 's-1', 'c-1', 'term-fall-2025', '2026-08-24', 'present', 'Participated actively'),
      ('att-s1-04', 's-1', 'c-1', 'term-fall-2025', '2026-08-25', 'present', 'On time'),
      ('att-s1-05', 's-1', 'c-1', 'term-fall-2025', '2026-08-26', 'present', 'On time'),
      ('att-s1-06', 's-1', 'c-1', 'term-fall-2025', '2026-08-27', 'late', 'Medical clinic appointment')
      ON CONFLICT (student_id, date, class_id) DO NOTHING;
    `);
  }
}

async function seedInitialData() {
  const termsRes = await pglite.query<{ count: string }>('SELECT COUNT(*) as count FROM terms');
  if (Number(termsRes.rows[0]?.count || 0) > 0) {
    return;
  }

  // Seed Terms
  await pglite.query(`
    INSERT INTO terms (id, name, academic_year, is_active) VALUES
    ('term-fall-2025', 'Fall Term 2025', '2025-2026', true),
    ('term-spring-2026', 'Spring Term 2026', '2025-2026', false);
  `);

  // Seed Classes
  await pglite.query(`
    INSERT INTO classes (id, code, title, grade, instructor, room, schedule, capacity) VALUES
    ('c-1', 'PHY-301', 'AP Physics C: Mechanics', 'Grade 11-12', 'Dr. Eleanor Vance', 'Lab B-204', 'Mon, Wed, Fri 09:00 - 10:15 AM', 30),
    ('c-2', 'CS-201', 'Data Structures & Algorithms', 'Grade 10-12', 'Sarah Lindqvist', 'Tech Hub 102', 'Tue, Thu 10:30 - 12:00 PM', 32),
    ('c-3', 'LIT-402', 'Comparative Literature Seminar', 'Grade 12', 'Prof. Jonathan Hayes', 'Hall A-110', 'Mon, Wed 01:15 - 02:45 PM', 25),
    ('c-4', 'BIO-101', 'Foundations of Biology', 'Grade 9-10', 'Dr. Marcus Thorne', 'Lab B-108', 'Tue, Thu, Fri 08:30 - 09:45 AM', 30);
  `);

  // Seed Students
  await pglite.query(`
    INSERT INTO students (id, student_id, first_name, last_name, grade, section, email, guardian_name, guardian_phone, avatar_url, gpa) VALUES
    ('s-1', 'STU-2024-001', 'Sophia', 'Martinez', 'Grade 11', 'Section A (STEM)', 's.martinez@greenfield.edu', 'Carlos Martinez', '+1 (555) 234-8901', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 3.94),
    ('s-2', 'STU-2024-002', 'Alexander', 'Chen', 'Grade 12', 'Section B (Honors)', 'a.chen@greenfield.edu', 'Li Wei Chen', '+1 (555) 345-6712', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', 4.00),
    ('s-3', 'STU-2024-003', 'Amara', 'Okafor', 'Grade 10', 'Section C (Arts)', 'a.okafor@greenfield.edu', 'Ngozi Okafor', '+1 (555) 890-1234', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', 3.82),
    ('s-4', 'STU-2024-004', 'Liam', 'O''Connor', 'Grade 11', 'Section A (STEM)', 'l.oconnor@greenfield.edu', 'Sean O''Connor', '+1 (555) 432-1098', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 3.65),
    ('s-5', 'STU-2024-005', 'Elena', 'Rostova', 'Grade 9', 'Section A (General)', 'e.rostova@greenfield.edu', 'Dmitri Rostov', '+1 (555) 678-9012', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80', 3.91),
    ('s-6', 'STU-2024-006', 'Marcus', 'Vance', 'Grade 12', 'Section A (Humanities)', 'm.vance@greenfield.edu', 'Rachel Vance', '+1 (555) 912-3456', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 3.42),
    ('s-7', 'STU-2024-007', 'Chloe', 'Dubois', 'Grade 10', 'Section B (Science)', 'c.dubois@greenfield.edu', 'Henri Dubois', '+1 (555) 789-0123', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', 3.88),
    ('s-8', 'STU-2024-008', 'David', 'Kim', 'Grade 11', 'Section A (STEM)', 'd.kim@greenfield.edu', 'Min-jun Kim', '+1 (555) 654-3210', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', 3.97),
    ('s-9', 'STU-2024-009', 'Aaliyah', 'Patel', 'Grade 12', 'Section B (Honors)', 'a.patel@greenfield.edu', 'Dev Patel', '+1 (555) 789-4321', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', 3.89),
    ('s-10', 'STU-2024-010', 'Lucas', 'Silva', 'Grade 10', 'Section A (STEM)', 'l.silva@greenfield.edu', 'Mateo Silva', '+1 (555) 890-5678', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', 3.76);
  `);

  // Seed Enrollments
  await pglite.query(`
    INSERT INTO enrollments (id, class_id, student_id) VALUES
    ('en-1', 'c-1', 's-1'),
    ('en-2', 'c-1', 's-2'),
    ('en-3', 'c-1', 's-4'),
    ('en-4', 'c-1', 's-6'),
    ('en-5', 'c-1', 's-8'),
    ('en-6', 'c-1', 's-9'),

    ('en-7', 'c-2', 's-1'),
    ('en-8', 'c-2', 's-3'),
    ('en-9', 'c-2', 's-4'),
    ('en-10', 'c-2', 's-7'),
    ('en-11', 'c-2', 's-8'),
    ('en-12', 'c-2', 's-10'),

    ('en-13', 'c-3', 's-2'),
    ('en-14', 'c-3', 's-3'),
    ('en-15', 'c-3', 's-5'),
    ('en-16', 'c-3', 's-6'),
    ('en-17', 'c-3', 's-9'),

    ('en-18', 'c-4', 's-3'),
    ('en-19', 'c-4', 's-5'),
    ('en-20', 'c-4', 's-7'),
    ('en-21', 'c-4', 's-10');
  `);

  // Seed Subjects / Learning Areas
  await pglite.query(`
    INSERT INTO subjects (id, code, name, department, curriculum_type) VALUES
    ('sub-phy', 'PHY-101', 'Physics & Physical Science', 'Sciences', 'both'),
    ('sub-math', 'MATH-201', 'Integrated Mathematics', 'Mathematics', 'both'),
    ('sub-cs', 'CS-101', 'Computer Science & Computational Thinking', 'Technology', 'both'),
    ('sub-eng', 'ENG-101', 'English Language & Literary Arts', 'Languages', 'both'),
    ('sub-agr', 'AGR-101', 'Agriculture & Environmental Nutrition', 'Applied Sciences', 'cbc'),
    ('sub-kis', 'KIS-101', 'Kiswahili na Mawasiliano', 'Languages', 'both')
    ON CONFLICT (code) DO NOTHING;
  `);

  // Seed Initial Assessments for standard classes
  await pglite.query(`
    INSERT INTO assessments (id, title, class_id, subject_id, term_id, assessment_type, evaluation_system, max_score, weightage, strand_name, sub_strand) VALUES
    ('asm-1', 'Mechanics & Dynamics CAT 1', 'c-1', 'sub-phy', 'term-fall-2025', 'CAT_1', 'numeric', 100.00, 20.00, 'Classical Mechanics', 'Newtonian Laws'),
    ('asm-2', 'Kinematics & Vectors Practical', 'c-1', 'sub-phy', 'term-fall-2025', 'STRAND_EVALUATION', 'cbc', 100.00, 30.00, 'Physical Sciences & Experimentation', 'Measurement & Precision Lab'),
    ('asm-3', 'Algorithm Design & Trees Assessment', 'c-2', 'sub-cs', 'term-fall-2025', 'CAT_1', 'numeric', 100.00, 25.00, 'Computing & Logic', 'Graph Theory & Data Structures'),
    ('asm-4', 'Computational Problem Solving Task', 'c-2', 'sub-cs', 'term-fall-2025', 'STRAND_EVALUATION', 'cbc', 100.00, 35.00, 'Digital Literacy & Innovation', 'Software System Design')
    ON CONFLICT (id) DO NOTHING;
  `);
}

/**
 * Seeds initial authenticated users with bcrypt hashed passwords and secondary profile mappings
 */
async function seedUsersAndProfiles(): Promise<void> {
  try {
    const userCountRes = await pglite.query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    if (Number(userCountRes.rows[0]?.count || 0) === 0) {
      const salt = bcrypt.genSaltSync(10);
      const defaultAdminPass = bcrypt.hashSync('Admin@2026!', salt);
      const defaultTeacherPass = bcrypt.hashSync('Teacher@2026!', salt);
      const defaultParentPass = bcrypt.hashSync('Parent@2026!', salt);
      const defaultStudentPass = bcrypt.hashSync('Student@2026!', salt);

      const users = [
        ['usr-admin-01', 'SCH-KEN-2026-001', 'admin@greenfield.edu', defaultAdminPass, 'Arthur', 'Pendelton', 'admin', 'active'],
        ['usr-admin-02', 'SCH-KEN-2026-001', 'principal@greenfield.edu', defaultAdminPass, 'Jeremiah', 'Thorne', 'principal', 'active'],
        ['usr-teacher-01', 'SCH-KEN-2026-001', 'e.vance@greenfield.edu', defaultTeacherPass, 'Eleanor', 'Vance', 'teacher', 'active'],
        ['usr-teacher-02', 'SCH-KEN-2026-001', 'm.thorne@greenfield.edu', defaultTeacherPass, 'Marcus', 'Thorne', 'teacher', 'active'],
        ['usr-parent-01', 'SCH-KEN-2026-001', 'carlos.martinez@gmail.com', defaultParentPass, 'Carlos', 'Martinez', 'parent', 'active'],
        ['usr-parent-02', 'SCH-KEN-2026-001', 'li.chen@outlook.com', defaultParentPass, 'Li Wei', 'Chen', 'parent', 'active'],
        ['usr-student-01', 'SCH-KEN-2026-001', 's.martinez@greenfield.edu', defaultStudentPass, 'Sophia', 'Martinez', 'student', 'active'],
        ['usr-student-02', 'SCH-KEN-2026-001', 'a.chen@greenfield.edu', defaultStudentPass, 'Alexander', 'Chen', 'student', 'active'],
      ];

      for (const u of users) {
        await pglite.query(
          `INSERT INTO users (id, school_id, email, password_hash, first_name, last_name, role, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (email) DO NOTHING;`,
          u
        );
      }

      // Link Secondary Teachers Profile
      const teachers = [
        ['tch-01', 'usr-teacher-01', 'STF-PHY-01', 'Physics & Classical Mechanics', 'Sciences', '+254 711 001122'],
        ['tch-02', 'usr-teacher-02', 'STF-BIO-02', 'Biology & Ecology', 'Sciences', '+254 711 002233'],
      ];
      for (const t of teachers) {
        await pglite.query(
          `INSERT INTO teachers (id, user_id, staff_id, specialization, department, phone)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING;`,
          t
        );
      }

      // Link Secondary Parents Profile
      const parents = [
        ['prt-01', 'usr-parent-01', 'ID-88991122', 'Civil Engineer', '+254 708 374149'],
        ['prt-02', 'usr-parent-02', 'ID-44556677', 'Financial Analyst', '+254 712 345678'],
      ];
      for (const p of parents) {
        await pglite.query(
          `INSERT INTO parents (id, user_id, national_id, occupation, phone)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING;`,
          p
        );
      }

      // Link student secondary profile
      await pglite.query(`UPDATE students SET user_id = 'usr-student-01' WHERE id = 's-1';`);
      await pglite.query(`UPDATE students SET user_id = 'usr-student-02' WHERE id = 's-2';`);

      // Update parent_students parent_id mapping
      await pglite.query(`UPDATE parent_students SET parent_id = 'prt-01' WHERE parent_user_id = 'usr-parent-01';`);
      await pglite.query(`UPDATE parent_students SET parent_id = 'prt-02' WHERE parent_user_id = 'usr-parent-02';`);

      // Seed Teacher Subject & Class Assignments
      const teacherAssignments = [
        ['ta-01', 'tch-01', 'c-1', 'sub-phy', '2025-2026', 'term-fall-2025', true],
        ['ta-02', 'tch-01', 'c-2', 'sub-cs', '2025-2026', 'term-fall-2025', true],
        ['ta-03', 'tch-02', 'c-4', 'sub-agr', '2025-2026', 'term-fall-2025', true],
      ];
      for (const ta of teacherAssignments) {
        await pglite.query(
          `INSERT INTO teacher_assignments (id, teacher_id, class_id, subject_id, academic_year, term_id, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (teacher_id, class_id, subject_id, term_id) DO NOTHING;`,
          ta
        );
      }
    }
  } catch (err) {
    console.error('Error seeding users and secondary profiles:', err);
  }
}

