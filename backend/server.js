// ═══════════════════════════════════════════════════════════════
//  server.js — Campus Portal Backend (Node.js + Express + MySQL)
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const cors           = require('cors');
const path           = require('path');

const authRoutes      = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const studentRoutes   = require('./routes/students');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin:      'http://localhost:5000',  // Same origin (frontend served by Express)
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Session ──────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || 'campus_portal_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   false,       // Set true if using HTTPS in production
    maxAge:   8 * 60 * 60 * 1000,  // 8 hours
  },
}));

// ─── Static Files ─────────────────────────────────────────────
// Serve the entire frontend folder as static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/students',   studentRoutes);

// ─── Catch-all: serve index.html for any non-API route ────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  app.listen(PORT, async () => {
  console.log(`\n🎓  Campus Portal running at → http://localhost:${PORT}`);
  console.log(`📁  Serving frontend from   → ../frontend`);
  console.log(`🗄️   API endpoints at        → http://localhost:${PORT}/api\n`);

  // Auto-seed database on first startup if tables are empty
  try {
    const db = require('./db');
    const bcrypt = require('bcryptjs');

    // Create tables if they don't exist
    await db.query(`CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      en_number VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL,
      year TINYINT NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS complaints (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      student_en_number VARCHAR(20) NOT NULL,
      student_name VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      image_path VARCHAR(500) DEFAULT NULL,
      status ENUM('Pending','In_Progress','Resolved') NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      INDEX idx_student (student_id),
      INDEX idx_status (status),
      INDEX idx_category (category)
    )`);

    // Only seed if admins table is empty
    const [[{ cnt }]] = await db.execute('SELECT COUNT(*) AS cnt FROM admins');
    if (Number(cnt) === 0) {
      console.log('🌱  Seeding database for first time...');

      const STUDENTS = [
        ['EN24156683','Rohan Hede','Computer Science',3],
        ['EN24156684','Rohit Hande','Electrical',2],
        ['EN24156685','Karan Pawar','Civil',1],
        ['EN24156686','Shivraj Sule','Mechanical',4],
        ['EN24156687','Sujit Khanapure','Electronics',2],
        ['EN24156688','Akshay Vhanmane','Information Technology',3],
        ['EN24156689','Samarth Borale','Computer Science',1],
        ['EN24156690','Vishal Gholve','Electrical',2],
        ['EN24156691','Jagdish Shinde','Civil',3],
        ['EN24156692','Piyush Sathe','Mechanical',1],
        ['EN24156693','Omkar Billa','Computer Science',2],
        ['EN24156694','Shantesh Bhakare','Electronics',4],
        ['EN24156695','Priya Kulkarni','Information Technology',3],
        ['EN24156696','Sneha More','Computer Science',1],
        ['EN24156697','Pooja Patil','Electrical',2],
        ['EN24156698','Anita Jadhav','Civil',3],
        ['EN24156699','Rahul Deshmukh','Mechanical',2],
        ['EN24156700','Neha Gaikwad','Computer Science',1],
      ];

      for (const [en, name, dept, year] of STUDENTS) {
        await db.execute(
          'INSERT IGNORE INTO students (en_number, name, department, year) VALUES (?,?,?,?)',
          [en, name, dept, year]
        );
      }

      const ADMINS = [
        ['Rohan',  'Rohan@21',  'Rohan (Admin)'],
        ['Rohit',  'Rohit@38',  'Rohit (Admin)'],
        ['Maroti', 'Maroti@39', 'Maroti (Admin)'],
        ['Sanket', 'Sanket@40', 'Sanket (Admin)'],
      ];

      for (const [username, password, name] of ADMINS) {
        const hash = await bcrypt.hash(password, 10);
        await db.execute(
          'INSERT IGNORE INTO admins (username, password, name) VALUES (?,?,?)',
          [username, hash, name]
        );
      }

      // Sample complaints
      const [studentRows] = await db.execute('SELECT id, en_number, name FROM students LIMIT 8');
      const samples = [
        ['WiFi',        'WiFi not working in Block-A lab since Monday morning.',          'Pending'],
        ['Electricity', 'Power fluctuation in Room 204 causing computers to reset.',      'In_Progress'],
        ['Water',       'No water supply in girls hostel C-wing since yesterday.',        'Pending'],
        ['Classroom',   'Projector in CS-301 not functioning.',                           'Resolved'],
        ['Cleanliness', 'Garbage not collected near canteen area for 3 days.',            'Pending'],
        ['Hostel',      'Broken window in hostel room H-105, security concern.',          'In_Progress'],
        ['WiFi',        'Internet speed extremely slow in library.',                       'Pending'],
        ['Other',       'Notice board in front of admin office is broken.',               'Pending'],
      ];

      for (let i = 0; i < samples.length; i++) {
        const [cat, desc, status] = samples[i];
        const st = studentRows[i % studentRows.length];
        await db.execute(
          `INSERT INTO complaints (student_id, student_en_number, student_name, category, description, status)
           VALUES (?,?,?,?,?,?)`,
          [st.id, st.en_number, st.name, cat, desc, status]
        );
      }

      console.log('✅  Database seeded successfully!');
    } else {
      console.log('✅  Database already has data — skipping seed.');
    }
  } catch (e) {
    console.error('❌  Auto-seed error:', e.message);
  }
});
});
