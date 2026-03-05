-- ═══════════════════════════════════════════════════════════
--  Campus Portal — MySQL Schema + Seed Data
--  Run this file once: mysql -u root -p < schema.sql
-- ═══════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS campus_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campus_portal;

-- ─── Students ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id         INT          AUTO_INCREMENT PRIMARY KEY,
  en_number  VARCHAR(20)  NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  year       TINYINT      NOT NULL DEFAULT 1,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ─── Admins ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id         INT          AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,   -- bcrypt hash
  name       VARCHAR(100) NOT NULL,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ─── Complaints ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id                INT           AUTO_INCREMENT PRIMARY KEY,
  student_id        INT           NOT NULL,
  student_en_number VARCHAR(20)   NOT NULL,
  student_name      VARCHAR(100)  NOT NULL,
  category          VARCHAR(50)   NOT NULL,
  description       TEXT          NOT NULL,
  image_path        VARCHAR(500)  DEFAULT NULL,
  status            ENUM('Pending','In_Progress','Resolved') NOT NULL DEFAULT 'Pending',
  created_at        DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_student    (student_id),
  INDEX idx_status     (status),
  INDEX idx_category   (category),
  INDEX idx_created    (created_at)
);

-- ═══════════════════════════════════════════════════════════
--  SEED DATA
-- ═══════════════════════════════════════════════════════════

-- ─── Seed Students ───────────────────────────────────────────
-- To add 1000+ students: copy this pattern or use LOAD DATA INFILE
-- with a CSV.  Format: (en_number, name, department, year)
INSERT IGNORE INTO students (en_number, name, department, year) VALUES
  ('EN24156683', 'Rohan Hede',        'Computer Science',      3),
  ('EN24156684', 'Rohit Hande',       'Electrical',            2),
  ('EN24156685', 'Karan Sule',       'Civil',                 1),
  ('EN24156686', 'Shivraj Khanapure',      'Mechanical',            4),
  ('EN24156687', 'Sujit Nil',   'Electronics',           2),
  ('EN24156688', 'Akshay Vhanmane',   'Information Technology',3),
  ('EN24156689', 'Samarth Borale',    'Computer Science',      1),
  ('EN24156690', 'Vishal Gholve',     'Electrical',            2),
  ('EN24156691', 'Jagdish Shinde',    'Civil',                 3),
  ('EN24156692', 'Piyush Sathe',      'Mechanical',            1),
  ('EN24156693', 'Omkar Billa',       'Computer Science',      2),
  ('EN24156694', 'Shantesh Bhakare',  'Electronics',           4),
  ('EN24156695', 'Priya Kulkarni',    'Information Technology',3),
  ('EN24156696', 'Sneha More',        'Computer Science',      1),
  ('EN24156697', 'Pooja Patil',       'Electrical',            2),
  ('EN24156698', 'Anita Jadhav',      'Civil',                 3),
  ('EN24156699', 'Rahul Deshmukh',    'Mechanical',            2),
  ('EN24156700', 'Neha Gaikwad',      'Computer Science',      1);

-- ─── Seed Admins (passwords are bcrypt hashes) ───────────────
-- Plain passwords:  Rohan→Rohan@21  Rohit→Rohit@38
--                   Maroti→Maroti@39  Sanket→Sanket@40
-- Regenerate hashes with: node -e "const b=require('bcryptjs');console.log(b.hashSync('Rohan@21',10))"
INSERT IGNORE INTO admins (username, password, name) VALUES
  ('Rohan',  '$2a$10$5U2W7P3qHl2aK3m5N9x6OO3WKD9kFhP5rVqVg6uN4bEQ1JTzfKZly', 'Rohan (Admin)'),
  ('Rohit',  '$2a$10$YqZ2W5P4qIl3bL4n6O.7PPqWLE.kGiQ6sWrWh7vO5cFR2KUagLana', 'Rohit (Admin)'),
  ('Maroti', '$2a$10$8V3X8Q5rJm4cM5o7P1y8QQrXMF1lHjR7tXsXi8wP6dGS3LVbhMbmw', 'Maroti (Admin)'),
  ('Sanket', '$2a$10$9W4Y9R6sKn5dN6p8Q2z9RRsYNG2mIkS8uYtYj9xQ7eHT4MWciNcnx', 'Sanket (Admin)');

-- ─── Seed Complaints ─────────────────────────────────────────
INSERT IGNORE INTO complaints (id, student_id, student_en_number, student_name, category, description, status, created_at, updated_at) VALUES
  (1, 1, 'EN24156683', 'Rohan Hede',      'WiFi',        'WiFi not working in Block-A lab since Monday. Students unable to access online resources.',       'Pending',     NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY),
  (2, 1, 'EN24156683', 'Rohan Hede',      'Electricity', 'Power fluctuation in Room 204 causing equipment to reset. Computers lose unsaved work.',          'In_Progress', NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 5 DAY),
  (3, 2, 'EN24156684', 'Rohit Hande',     'Water',       'No water supply in girls hostel C-wing since yesterday evening.',                                  'Pending',     NOW() - INTERVAL 8 DAY,  NOW() - INTERVAL 8 DAY),
  (4, 3, 'EN24156685', 'Karan Pawar',     'Classroom',   'Projector in CS-301 classroom not functioning. Professor using whiteboard for all lectures.',      'Resolved',    NOW() - INTERVAL 15 DAY, NOW() - INTERVAL 3 DAY),
  (5, 4, 'EN24156686', 'Shivraj Sule',    'Cleanliness', 'Garbage not collected near canteen for 3 days. Smell is affecting the eating experience.',          'Pending',     NOW() - INTERVAL 7 DAY,  NOW() - INTERVAL 7 DAY),
  (6, 5, 'EN24156687', 'Sujit Khanapure', 'Hostel',      'Broken window in hostel room H-105. Security concern and cold air entering at night.',              'In_Progress', NOW() - INTERVAL 11 DAY, NOW() - INTERVAL 4 DAY),
  (7, 6, 'EN24156688', 'Akshay Vhanmane', 'WiFi',        'Internet speed extremely slow in library. Downloads timing out.',                                   'Pending',     NOW() - INTERVAL 6 DAY,  NOW() - INTERVAL 6 DAY),
  (8, 7, 'EN24156689', 'Samarth Borale',  'Electricity', 'Street lights on main road outside hostel not working after 8 PM. Safety concern.',                'Resolved',    NOW() - INTERVAL 18 DAY, NOW() - INTERVAL 2 DAY),
  (9, 8, 'EN24156690', 'Vishal Gholve',   'Water',       'Water leakage in ground floor washroom near gym. Floor always wet, creating slip hazard.',          'Pending',     NOW() - INTERVAL 5 DAY,  NOW() - INTERVAL 5 DAY),
  (10,2, 'EN24156684', 'Rohit Hande',     'Other',       'Notice board in front of admin office is broken. Important notices keep falling down.',             'Pending',     NOW() - INTERVAL 4 DAY,  NOW() - INTERVAL 4 DAY);
