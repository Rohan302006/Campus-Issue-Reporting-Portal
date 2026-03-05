// ─── routes/complaints.js ─────────────────────────────────────
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');
const router  = express.Router();

// ── Multer — image upload config ──────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `complaint_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files (jpg, png, gif, webp) are allowed.'));
  },
});

// ── Auth middleware ────────────────────────────────────────────
function requireStudent(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'STUDENT')
    return res.status(401).json({ error: 'Student login required.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'ADMIN')
    return res.status(401).json({ error: 'Admin login required.' });
  next();
}

// ══════════════════════════════════════════════════════════════
//  IMPORTANT: All fixed-path routes (/my, /stats, /my/stats)
//  MUST be declared BEFORE the wildcard route (/:id).
//  If /:id comes first, Express will match "stats" as an id
//  and the correct handler is never reached.
// ══════════════════════════════════════════════════════════════

// ── GET /api/complaints/my ────────────────────────────────────
// Student: get their own complaints
router.get('/my', requireStudent, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, category, description, image_path, status, created_at, updated_at
       FROM complaints
       WHERE student_id = ?
       ORDER BY created_at DESC`,
      [req.session.user.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /my error:', err);
    return res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

// ── GET /api/complaints/my/stats ──────────────────────────────
// Student: get their own stats
router.get('/my/stats', requireStudent, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         COUNT(*)                    AS total,
         SUM(status = 'Pending')     AS pending,
         SUM(status = 'In_Progress') AS inProgress,
         SUM(status = 'Resolved')    AS resolved
       FROM complaints
       WHERE student_id = ?`,
      [req.session.user.id]
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error('GET /my/stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ── GET /api/complaints/stats ─────────────────────────────────
// Admin: overall stats across all complaints
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         COUNT(*)                    AS total,
         SUM(status = 'Pending')     AS pending,
         SUM(status = 'In_Progress') AS inProgress,
         SUM(status = 'Resolved')    AS resolved
       FROM complaints`
    );
    return res.json(rows[0]);
  } catch (err) {
    console.error('GET /stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ── GET /api/complaints ───────────────────────────────────────
// Admin: paginated + filtered list of ALL complaints
router.get('/', requireAdmin, async (req, res) => {
  try {
    const search   = (req.query.search   || '').trim();
    const status   = (req.query.status   || '').trim();
    const category = (req.query.category || '').trim();
    // Cast to integer — mysql2 requires integers for LIMIT/OFFSET
    const size   = Math.min(50, Math.max(1, parseInt(req.query.size,  10) || 10));
    const page   = Math.max(0,             parseInt(req.query.page,  10) || 0);

    const conditions = [];
    const params     = [];

    if (search) {
      conditions.push(
        `(student_en_number LIKE ? OR student_name LIKE ? OR description LIKE ? OR category LIKE ?)`
      );
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (status)   { conditions.push('status = ?');   params.push(status); }
    if (category) { conditions.push('category = ?'); params.push(category); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    // Total count for pagination
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM complaints ${where}`,
      params
    );
    const total      = Number(countRows[0].total);
    const totalPages = Math.max(1, Math.ceil(total / size));
    const safePage   = Math.min(page, totalPages - 1);
    const offset     = safePage * size;

    // Fetch the page of data
    // IMPORTANT: LIMIT and OFFSET must be plain integers, not strings.
    const [rows] = await db.execute(
      `SELECT id, student_id, student_en_number, student_name,
              category, description, image_path, status, created_at, updated_at
       FROM complaints ${where}
       ORDER BY created_at DESC
       LIMIT ${size} OFFSET ${offset}`,
      params
    );

    return res.json({
      items:      rows,
      total,
      page:       safePage,
      size,
      totalPages,
      isLast:     safePage >= totalPages - 1,
    });

  } catch (err) {
    console.error('GET /complaints error:', err);
    return res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

// ── POST /api/complaints ──────────────────────────────────────
// Student: submit a new complaint (multipart/form-data)
router.post('/', requireStudent, upload.single('image'), async (req, res) => {
  try {
    const { category, description } = req.body;
    const { id, enNumber, name }    = req.session.user;

    if (!category || !category.trim())
      return res.status(400).json({ error: 'Please select a category.' });
    if (!description || description.trim().length < 10)
      return res.status(400).json({ error: 'Description must be at least 10 characters.' });

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.execute(
      `INSERT INTO complaints
         (student_id, student_en_number, student_name, category, description, image_path, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
      [id, enNumber, name, category.trim(), description.trim(), imagePath]
    );

    return res.status(201).json({ message: 'Complaint submitted successfully.', id: result.insertId });

  } catch (err) {
    console.error('POST /complaints error:', err);
    return res.status(500).json({ error: 'Failed to submit complaint.' });
  }
});

// ── PATCH /api/complaints/:id/status ─────────────────────────
// Admin: update status of a specific complaint
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'In_Progress', 'Resolved'].includes(status))
      return res.status(400).json({ error: 'Invalid status value.' });

    const [result] = await db.execute(
      `UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Complaint not found.' });

    return res.json({ message: 'Status updated successfully.' });

  } catch (err) {
    console.error('PATCH status error:', err);
    return res.status(500).json({ error: 'Failed to update status.' });
  }
});

// ── DELETE /api/complaints/:id ────────────────────────────────
// Admin: delete a complaint and its uploaded image
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT image_path FROM complaints WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: 'Complaint not found.' });

    await db.execute('DELETE FROM complaints WHERE id = ?', [req.params.id]);

    if (rows[0].image_path) {
      const filePath = path.join(__dirname, '..', rows[0].image_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    return res.json({ message: 'Complaint deleted.' });

  } catch (err) {
    console.error('DELETE complaint error:', err);
    return res.status(500).json({ error: 'Failed to delete complaint.' });
  }
});

module.exports = router;
