const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const VALID_CATEGORIES = ['internship', 'certification', 'project', 'hackathon'];

// Middleware to ensure user is a teacher
const requireTeacher = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Access denied. Teacher role required.' });
  }
  next();
};

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
      INSERT INTO achievements (student_id, title, category, description, link, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, student_id, title, category, description, link, status, teacher_feedback, created_at
    `;

    const result = await db.query(insertQuery, [
      studentId,
      title.trim(),
      category,
      description ? description.trim() : null,
      link ? link.trim() : null
    ]);

    return res.status(201).json({
      message: 'Achievement submitted for teacher review.',
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
      SELECT id, student_id, title, category, description, link, status, teacher_feedback, created_at
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

// 3. GET /achievements/pending - Teacher views pending achievements for students in their department
router.get('/pending', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const teacherId = req.user.id;

    const teacherRes = await db.query('SELECT department FROM users WHERE id = $1', [teacherId]);
    if (teacherRes.rows.length === 0) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }
    const { department } = teacherRes.rows[0];

    const query = `
      SELECT 
        a.id, 
        a.student_id, 
        a.title, 
        a.category, 
        a.description, 
        a.link, 
        a.status, 
        a.teacher_feedback, 
        a.created_at,
        u.name AS student_name,
        u.email AS student_email,
        u.class AS student_class
      FROM achievements a
      JOIN users u ON a.student_id = u.id
      WHERE u.department = $1 AND a.status = 'pending'
      ORDER BY a.created_at ASC
    `;
    const result = await db.query(query, [department]);

    return res.json({
      pending_achievements: result.rows
    });
  } catch (err) {
    console.error('Fetch pending achievements error:', err);
    return res.status(500).json({ message: 'Server error fetching pending achievements.' });
  }
});

// 4. PUT /achievements/:id/review - Teacher approves or rejects a student's achievement
router.put('/:id/review', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const achievementId = parseInt(req.params.id, 10);
    const { status, teacher_feedback } = req.body;
    const teacherId = req.user.id;

    if (isNaN(achievementId)) {
      return res.status(400).json({ message: 'Invalid achievement ID.' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "approved" or "rejected".' });
    }

    // Get teacher department
    const teacherRes = await db.query('SELECT department FROM users WHERE id = $1', [teacherId]);
    if (teacherRes.rows.length === 0) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }
    const teacherDept = teacherRes.rows[0].department;

    // Check achievement and student department
    const achQuery = `
      SELECT a.id, u.department 
      FROM achievements a
      JOIN users u ON a.student_id = u.id
      WHERE a.id = $1
    `;
    const achRes = await db.query(achQuery, [achievementId]);

    if (achRes.rows.length === 0) {
      return res.status(404).json({ message: 'Achievement not found.' });
    }

    if (achRes.rows[0].department !== teacherDept) {
      return res.status(403).json({ message: 'Access denied. You can only review achievements from your department.' });
    }

    const updateQuery = `
      UPDATE achievements
      SET status = $1, teacher_feedback = $2
      WHERE id = $3
      RETURNING id, student_id, title, category, description, link, status, teacher_feedback, created_at
    `;
    const updated = await db.query(updateQuery, [status, teacher_feedback || null, achievementId]);

    return res.json({
      message: `Achievement ${status} successfully.`,
      achievement: updated.rows[0]
    });
  } catch (err) {
    console.error('Review achievement error:', err);
    return res.status(500).json({ message: 'Server error reviewing achievement.' });
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
