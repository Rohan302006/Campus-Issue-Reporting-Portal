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
  console.log(`\n🎓  Campus Portal running at → http://localhost:${PORT}`);
  console.log(`📁  Serving frontend from   → ../frontend`);
  console.log(`🗄️   API endpoints at        → http://localhost:${PORT}/api\n`);
});
