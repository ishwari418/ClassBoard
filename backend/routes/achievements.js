const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const VALID_CATEGORIES = ['internship', 'certification', 'project', 'hackathon'];

// Middleware to ensure user is a student
const requireStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied. Student role required.' });
  }
  next();
};

// 1. POST /achievements - Student adds an achievement
router.post('/', authenticateToken, requireStudent, async (req, res) => {
  try {
    const { title, category, description, link } = req.body;
    const studentId = req.user.id;

    if (!title || !category) {
      return res.status(400).json({ message: 'Title and category are required.' });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ 
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` 
      });
    }

    const insertQuery = `
      INSERT INTO achievements (student_id, title, category, description, link)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, student_id, title, category, description, link, created_at
    `;

    const result = await db.query(insertQuery, [
      studentId,
      title.trim(),
      category,
      description ? description.trim() : null,
      link ? link.trim() : null
    ]);

    return res.status(201).json({
      message: 'Achievement added successfully.',
      achievement: result.rows[0]
    });
  } catch (err) {
    console.error('Add achievement error:', err);
    return res.status(500).json({ message: 'Server error adding achievement.' });
  }
});

// 2. GET /achievements/me - Logged-in student views their own achievements
router.get('/me', authenticateToken, requireStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const query = `
      SELECT id, student_id, title, category, description, link, created_at
      FROM achievements
      WHERE student_id = $1
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [studentId]);

    return res.json({
      achievements: result.rows
    });
  } catch (err) {
    console.error('Fetch my achievements error:', err);
    return res.status(500).json({ message: 'Server error fetching achievements.' });
  }
});

// 3. GET /achievements/:studentId - View achievements of a student
// Accessible to teachers, or students in the same class
router.get('/:studentId', authenticateToken, async (req, res) => {
  try {
    const targetStudentId = parseInt(req.params.studentId, 10);
    if (isNaN(targetStudentId)) {
      return res.status(400).json({ message: 'Invalid student ID.' });
    }

    // Get target student details
    const targetUserRes = await db.query(
      'SELECT id, name, email, role, department, class FROM users WHERE id = $1',
      [targetStudentId]
    );

    if (targetUserRes.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const targetStudent = targetUserRes.rows[0];

    // Authorization check
    if (req.user.role === 'student') {
      // Fetch requesting user class
      const requesterRes = await db.query('SELECT class FROM users WHERE id = $1', [req.user.id]);
      const requesterClass = requesterRes.rows[0]?.class;

      if (requesterClass !== targetStudent.class) {
        return res.status(403).json({
          message: 'Access denied. You can only view achievements of students in your class.'
        });
      }
    }
    // Teachers have access to view any student's achievements

    const achievementsRes = await db.query(
      `SELECT id, student_id, title, category, description, link, created_at
       FROM achievements
       WHERE student_id = $1
       ORDER BY created_at DESC`,
      [targetStudentId]
    );

    return res.json({
      student: targetStudent,
      achievements: achievementsRes.rows
    });
  } catch (err) {
    console.error('Fetch student achievements error:', err);
    return res.status(500).json({ message: 'Server error fetching achievements.' });
  }
});

// 4. DELETE /achievements/:id - Student deletes their own achievement
router.delete('/:id', authenticateToken, requireStudent, async (req, res) => {
  try {
    const achievementId = parseInt(req.params.id, 10);
    if (isNaN(achievementId)) {
      return res.status(400).json({ message: 'Invalid achievement ID.' });
    }

    // Check ownership
    const checkRes = await db.query(
      'SELECT id, student_id FROM achievements WHERE id = $1',
      [achievementId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Achievement not found.' });
    }

    if (checkRes.rows[0].student_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own achievements.' });
    }

    await db.query('DELETE FROM achievements WHERE id = $1', [achievementId]);

    return res.json({ message: 'Achievement deleted successfully.' });
  } catch (err) {
    console.error('Delete achievement error:', err);
    return res.status(500).json({ message: 'Server error deleting achievement.' });
  }
});

module.exports = router;
