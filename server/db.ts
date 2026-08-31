import { PGlite } from '@electric-sql/pglite';
import knex from 'knex';
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

  // 12. Parent & Student Relationship Mapping Table
  await pglite.query(`
    CREATE TABLE IF NOT EXISTS parent_students (
      id VARCHAR(64) PRIMARY KEY,
      parent_user_id VARCHAR(64) NOT NULL,
      parent_name VARCHAR(255) NOT NULL,
      parent_email VARCHAR(255) NOT NULL,
      parent_phone VARCHAR(20) NOT NULL,
      student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      relationship VARCHAR(64) DEFAULT 'Parent/Guardian'
    );
  `);

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

  // Ensure fee accounts and parents exist
  await seedFeeAccountsAndParents();
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

    await pglite.query(`
      INSERT INTO assessments (id, title, class_id, subject_id, term_id, assessment_type, evaluation_system, max_score, weightage, strand_name, sub_strand) VALUES
      ('asm-1', 'Mechanics & Dynamics CAT 1', 'c-1', 'sub-phy', 'term-fall-2025', 'CAT_1', 'numeric', 100.00, 20.00, 'Classical Mechanics', 'Newtonian Laws'),
      ('asm-2', 'Kinematics & Vectors Practical', 'c-1', 'sub-phy', 'term-fall-2025', 'STRAND_EVALUATION', 'cbc', 100.00, 30.00, 'Physical Sciences & Experimentation', 'Measurement & Precision Lab'),
      ('asm-3', 'Algorithm Design & Trees Assessment', 'c-2', 'sub-cs', 'term-fall-2025', 'CAT_1', 'numeric', 100.00, 25.00, 'Computing & Logic', 'Graph Theory & Data Structures'),
      ('asm-4', 'Computational Problem Solving Task', 'c-2', 'sub-cs', 'term-fall-2025', 'STRAND_EVALUATION', 'cbc', 100.00, 35.00, 'Digital Literacy & Innovation', 'Software System Design')
      ON CONFLICT (id) DO NOTHING;
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
