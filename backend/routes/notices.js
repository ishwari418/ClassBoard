const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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

// 1. POST /notices — teacher creates a notice scoped to their own department
router.post('/', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const { title, message } = req.body;
    const teacherId = req.user.id;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }

    // Retrieve teacher's department
    const teacherRes = await db.query('SELECT department, name FROM users WHERE id = $1', [teacherId]);
    if (teacherRes.rows.length === 0) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    const { department, name: teacherName } = teacherRes.rows[0];

    const insertQuery = `
      INSERT INTO notices (teacher_id, title, message, department)
      VALUES ($1, $2, $3, $4)
      RETURNING id, teacher_id, title, message, department, created_at
    `;

    const result = await db.query(insertQuery, [
      teacherId,
      title.trim(),
      message.trim(),
      department
    ]);

    const notice = result.rows[0];

    return res.status(201).json({
      message: 'Notice posted successfully.',
      notice: {
        ...notice,
        teacher_name: teacherName
      }
    });
  } catch (err) {
    console.error('Post notice error:', err);
    return res.status(500).json({ message: 'Server error posting notice.' });
  }
});

// 2. GET /notices — Get notices for logged-in user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get user details
    const userRes = await db.query('SELECT department FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const { department } = userRes.rows[0];

    if (userRole === 'student') {
      // Return notices for student's department with read flag
      const query = `
        SELECT 
          n.id, 
          n.teacher_id, 
          n.title, 
          n.message, 
          n.department, 
          n.created_at,
          u.name AS teacher_name,
          CASE WHEN nr.id IS NOT NULL THEN true ELSE false END AS is_read
        FROM notices n
        JOIN users u ON n.teacher_id = u.id
        LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.student_id = $1
        WHERE n.department = $2
        ORDER BY n.created_at DESC
      `;
      const result = await db.query(query, [userId, department]);

      return res.json({
        notices: result.rows
      });
    } else {
      // Teacher: Return notices posted by teacher, along with read statistics
      const query = `
        SELECT 
          n.id, 
          n.teacher_id, 
          n.title, 
          n.message, 
          n.department, 
          n.created_at,
          u.name AS teacher_name
        FROM notices n
        JOIN users u ON n.teacher_id = u.id
        WHERE n.teacher_id = $1
        ORDER BY n.created_at DESC
      `;
      const result = await db.query(query, [userId]);

      const noticesWithStats = await Promise.all(
        result.rows.map(async (notice) => {
          const readsRes = await db.query(
            'SELECT COUNT(*) AS count FROM notice_reads WHERE notice_id = $1',
            [notice.id]
          );
          const studentsRes = await db.query(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND department = $1",
            [notice.department]
          );

          return {
            ...notice,
            read_count: parseInt(readsRes.rows[0].count, 10) || 0,
            total_students: parseInt(studentsRes.rows[0].count, 10) || 0
          };
        })
      );

      return res.json({
        notices: noticesWithStats
      });
    }
  } catch (err) {
    console.error('Get notices error:', err);
    return res.status(500).json({ message: 'Server error fetching notices.' });
  }
});

// 3. POST /notices/:id/read — student marks a notice as read
router.post('/:id/read', authenticateToken, requireStudent, async (req, res) => {
  try {
    const noticeId = parseInt(req.params.id, 10);
    const studentId = req.user.id;

    if (isNaN(noticeId)) {
      return res.status(400).json({ message: 'Invalid notice ID.' });
    }

    // Verify notice exists
    const noticeRes = await db.query('SELECT id, department FROM notices WHERE id = $1', [noticeId]);
    if (noticeRes.rows.length === 0) {
      return res.status(404).json({ message: 'Notice not found.' });
    }

    // Check if read entry already exists
    const existingRead = await db.query(
      'SELECT id FROM notice_reads WHERE notice_id = $1 AND student_id = $2',
      [noticeId, studentId]
    );

    if (existingRead.rows.length === 0) {
      await db.query(
        'INSERT INTO notice_reads (notice_id, student_id) VALUES ($1, $2)',
        [noticeId, studentId]
      );
    }

    return res.json({ message: 'Notice marked as read.' });
  } catch (err) {
    console.error('Mark notice read error:', err);
    return res.status(500).json({ message: 'Server error marking notice as read.' });
  }
});

// 4. GET /notices/:id/read-stats — teacher sees how many students in their department have read a given notice
router.get('/:id/read-stats', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const noticeId = parseInt(req.params.id, 10);
    const teacherId = req.user.id;

    if (isNaN(noticeId)) {
      return res.status(400).json({ message: 'Invalid notice ID.' });
    }

    // Fetch notice and confirm ownership
    const noticeRes = await db.query(
      'SELECT id, teacher_id, title, department FROM notices WHERE id = $1',
      [noticeId]
    );

    if (noticeRes.rows.length === 0) {
      return res.status(404).json({ message: 'Notice not found.' });
    }

    const notice = noticeRes.rows[0];

    if (notice.teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Access denied. You can only view read statistics for notices you posted.' });
    }

    // Count read count
    const readCountRes = await db.query(
      'SELECT COUNT(*) AS read_count FROM notice_reads WHERE notice_id = $1',
      [noticeId]
    );
    const readCount = parseInt(readCountRes.rows[0].read_count, 10);

    // Count total students in this department
    const totalStudentsRes = await db.query(
      "SELECT COUNT(*) AS total_students FROM users WHERE role = 'student' AND department = $1",
      [notice.department]
    );
    const totalStudents = parseInt(totalStudentsRes.rows[0].total_students, 10);

    return res.json({
      notice_id: noticeId,
      title: notice.title,
      department: notice.department,
      read_count: readCount,
      total_students: totalStudents,
      display: `${readCount} of ${totalStudents} students have seen this`
    });
  } catch (err) {
    console.error('Get read-stats error:', err);
    return res.status(500).json({ message: 'Server error fetching read stats.' });
  }
});

// 5. DELETE /notices/:id — teacher deletes their own notice
router.delete('/:id', authenticateToken, requireTeacher, async (req, res) => {
  try {
    const noticeId = parseInt(req.params.id, 10);
    const teacherId = req.user.id;

    if (isNaN(noticeId)) {
      return res.status(400).json({ message: 'Invalid notice ID.' });
    }

    // Verify notice exists and check ownership
    const noticeRes = await db.query(
      'SELECT id, teacher_id FROM notices WHERE id = $1',
      [noticeId]
    );

    if (noticeRes.rows.length === 0) {
      return res.status(404).json({ message: 'Notice not found.' });
    }

    if (noticeRes.rows[0].teacher_id !== teacherId) {
      return res.status(403).json({ message: 'Access denied. You can only delete announcements you posted.' });
    }

    await db.query('DELETE FROM notices WHERE id = $1', [noticeId]);

    return res.json({ message: 'Notice deleted successfully.' });
  } catch (err) {
    console.error('Delete notice error:', err);
    return res.status(500).json({ message: 'Server error deleting notice.' });
  }
});

module.exports = router;
