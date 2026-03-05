// ═══════════════════════════════════════════════════════════════
//  seed.js  —  Run ONCE to set up database + seed data
//  Usage:  node seed.js
//
//  KEY FIX: conn.query()  is used for DDL  (CREATE DATABASE / USE / CREATE TABLE)
//           conn.execute() is used for DML (INSERT / SELECT)
//  Reason:  MySQL does not support prepared statements for DDL commands.
//           conn.execute() always uses prepared statements → crashes on DDL.
//           conn.query()   sends plain SQL text → works for everything.
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const STUDENTS = [
  { en: 'EN24156683', name: 'Rohan Hede', dept: 'Computer Science', year: 3 },
  { en: 'EN24156684', name: 'Rohit Hande', dept: 'Electrical', year: 2 },
  { en: 'EN24156685', name: 'Karan Sule', dept: 'Civil', year: 1 },
  { en: 'EN24156686', name: 'Shivraj Khanapure', dept: 'Mechanical', year: 4 },
  { en: 'EN24156687', name: 'Sujit Nil', dept: 'Electronics', year: 2 },
  { en: 'EN24156688', name: 'Akshay Vhanmane', dept: 'Information Technology', year: 3 },
  { en: 'EN24156689', name: 'Samarth Borale', dept: 'Computer Science', year: 1 },
  { en: 'EN24156690', name: 'Vishal Gholve', dept: 'Electrical', year: 2 },
  { en: 'EN24156691', name: 'Jagdish Shinde', dept: 'Civil', year: 3 },
  { en: 'EN24156692', name: 'Piyush Sathe', dept: 'Mechanical', year: 1 },
  { en: 'EN24156693', name: 'Omkar Billa', dept: 'Computer Science', year: 2 },
  { en: 'EN24156694', name: 'Shantesh Bhakare', dept: 'Electronics', year: 4 },
  { en: 'EN24156695', name: 'Priya Kulkarni', dept: 'Information Technology', year: 3 },
  { en: 'EN24156696', name: 'Sneha More', dept: 'Computer Science', year: 1 },
  { en: 'EN24156697', name: 'Pooja Patil', dept: 'Electrical', year: 2 },
  { en: 'EN24156698', name: 'Anita Jadhav', dept: 'Civil', year: 3 },
  { en: 'EN24156699', name: 'Rahul Deshmukh', dept: 'Mechanical', year: 2 },
  { en: 'EN24156700', name: 'Neha Gaikwad', dept: 'Computer Science', year: 1 },
];

const ADMINS = [
  { username: 'Rohan', password: 'Rohan@21', name: 'Rohan (Admin)' },
  { username: 'Rohit', password: 'Rohit@38', name: 'Rohit (Admin)' },
  { username: 'Maroti', password: 'Maroti@39', name: 'Maroti (Admin)' },
  { username: 'Sanket', password: 'Sanket@40', name: 'Sanket (Admin)' },
];

async function run() {
  let conn;
  try {
    console.log('\n🔌  Connecting to MySQL...');
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('   Connected.\n');

    // ── 1. Create & select database  (query, not execute) ─────────
    console.log('📦  Creating database campus_portal...');
    await conn.query('CREATE DATABASE IF NOT EXISTS campus_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await conn.query('USE campus_portal');
    console.log('   Done.\n');

    // ── 2. Create tables  (query, not execute) ────────────────────
    console.log('🗂️   Creating tables...');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS students (
        id         INT          AUTO_INCREMENT PRIMARY KEY,
        en_number  VARCHAR(20)  NOT NULL UNIQUE,
        name       VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        year       TINYINT      NOT NULL DEFAULT 1,
        created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id         INT          AUTO_INCREMENT PRIMARY KEY,
        username   VARCHAR(50)  NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        name       VARCHAR(100) NOT NULL,
        created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id                INT          AUTO_INCREMENT PRIMARY KEY,
        student_id        INT          NOT NULL,
        student_en_number VARCHAR(20)  NOT NULL,
        student_name      VARCHAR(100) NOT NULL,
        category          VARCHAR(50)  NOT NULL,
        description       TEXT         NOT NULL,
        image_path        VARCHAR(500) DEFAULT NULL,
        status            ENUM('Pending','In_Progress','Resolved') NOT NULL DEFAULT 'Pending',
        created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student  (student_id),
        INDEX idx_status   (status),
        INDEX idx_category (category)
      )
    `);
    console.log('   Done.\n');

    // ── 3. Seed students  (execute is fine for INSERT/SELECT) ─────
    console.log('👩‍🎓  Seeding students...');
    for (const s of STUDENTS) {
      await conn.execute(
        'INSERT IGNORE INTO students (en_number, name, department, year) VALUES (?, ?, ?, ?)',
        [s.en, s.name, s.dept, s.year]
      );
    }
    console.log(`   ✓  ${STUDENTS.length} students inserted (existing ones skipped)\n`);

    // ── 4. Seed admins with hashed passwords ──────────────────────
    console.log('🔐  Seeding admins...');
    for (const a of ADMINS) {
      const hash = await bcrypt.hash(a.password, 10);
      await conn.execute(
        'INSERT IGNORE INTO admins (username, password, name) VALUES (?, ?, ?)',
        [a.username, hash, a.name]
      );
      console.log(`   ✓  Admin "${a.username}" — password hashed and saved`);
    }
    console.log('');

    // ── 5. Seed sample complaints (only if table is empty) ────────
    const [[{ cnt }]] = await conn.execute('SELECT COUNT(*) AS cnt FROM complaints');
    if (Number(cnt) === 0) {
      console.log('📋  Seeding sample complaints...');
      const [studentRows] = await conn.execute('SELECT id, en_number, name FROM students LIMIT 10');
      const pick = i => studentRows[i % studentRows.length];

      const samples = [
        { cat: 'WiFi', desc: 'WiFi not working in Block-A lab since Monday morning.', status: 'Pending' },
        { cat: 'Electricity', desc: 'Power fluctuation in Room 204 causing computers to reset.', status: 'In_Progress' },
        { cat: 'Water', desc: 'No water supply in girls hostel C-wing since yesterday.', status: 'Pending' },
        { cat: 'Classroom', desc: 'Projector in CS-301 not functioning, professor using whiteboard.', status: 'Resolved' },
        { cat: 'Cleanliness', desc: 'Garbage not collected near canteen area for 3 days.', status: 'Pending' },
        { cat: 'Hostel', desc: 'Broken window in hostel room H-105, security concern at night.', status: 'In_Progress' },
        { cat: 'WiFi', desc: 'Internet speed extremely slow in library, downloads timing out.', status: 'Pending' },
        { cat: 'Other', desc: 'Notice board in front of admin office is broken.', status: 'Pending' },
      ];

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const st = pick(i);
        await conn.execute(
          `INSERT INTO complaints (student_id, student_en_number, student_name, category, description, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [st.id, st.en_number, st.name, s.cat, s.desc, s.status]
        );
      }
      console.log(`   ✓  ${samples.length} sample complaints inserted\n`);
    } else {
      console.log(`   ℹ️   Complaints table already has ${cnt} rows — skipping sample seed\n`);
    }

    console.log('✅  All done!  Now run:  node server.js');
    console.log('    Then open:  http://localhost:5000\n');

  } catch (err) {
    console.error('\n❌  Seed failed:', err.message);
    if (err.message.includes('ER_ACCESS_DENIED')) {
      console.error('    → Your MySQL password is wrong. Open backend/.env and fix DB_PASSWORD=');
    }
    if (err.message.includes('ECONNREFUSED')) {
      console.error('    → MySQL is not running. Start it from MySQL Workbench or Windows Services.');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
