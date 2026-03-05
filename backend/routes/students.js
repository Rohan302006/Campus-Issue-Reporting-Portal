// ─── routes/students.js ───────────────────────────────────────
const express = require('express');
const db      = require('../db');
const router  = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Admin login required.' });
  }
  next();
}

// GET /api/students
// Returns all students (admin only). Useful for admin management page.
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, en_number, name, department, year FROM students ORDER BY en_number'
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /students error:', err);
    return res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// POST /api/students
// Add a new student (admin only).
// Body: { enNumber, name, department, year }
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { enNumber, name, department, year } = req.body;

    if (!enNumber || !name || !department || !year) {
      return res.status(400).json({ error: 'All fields (enNumber, name, department, year) are required.' });
    }

    await db.execute(
      'INSERT INTO students (en_number, name, department, year) VALUES (?, ?, ?, ?)',
      [enNumber.trim().toUpperCase(), name.trim(), department.trim(), parseInt(year)]
    );

    return res.status(201).json({ message: 'Student added successfully.' });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `EN Number ${req.body.enNumber} already exists.` });
    }
    console.error('POST /students error:', err);
    return res.status(500).json({ error: 'Failed to add student.' });
  }
});

// POST /api/students/bulk
// Bulk-insert students from an array (admin only).
// Body: { students: [{ enNumber, name, department, year }, ...] }
// This is the main route for loading 1000+ students at once.
router.post('/bulk', requireAdmin, async (req, res) => {
  const { students } = req.body;

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: 'Provide a non-empty students array.' });
  }

  // Use a single multi-row INSERT IGNORE for performance
  const values = students.map(s => [
    (s.enNumber || s.en_number || '').trim().toUpperCase(),
    (s.name       || '').trim(),
    (s.department || '').trim(),
    parseInt(s.year) || 1,
  ]);

  // Reject if any row has empty required fields
  const invalid = values.filter(r => !r[0] || !r[1] || !r[2]);
  if (invalid.length > 0) {
    return res.status(400).json({
      error: `${invalid.length} rows are missing required fields (enNumber, name, department).`,
    });
  }

  try {
    const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
    const flat         = values.flat();

    const [result] = await db.execute(
      `INSERT IGNORE INTO students (en_number, name, department, year) VALUES ${placeholders}`,
      flat
    );

    return res.json({
      message:  `Bulk insert complete.`,
      inserted: result.affectedRows,
      skipped:  values.length - result.affectedRows,
      total:    values.length,
    });

  } catch (err) {
    console.error('POST /students/bulk error:', err);
    return res.status(500).json({ error: 'Bulk insert failed.' });
  }
});

module.exports = router;
