const db = require('./db');
const express = require('express');
const authRoutes = require('./routes/auth');
const achievementRoutes = require('./routes/achievements');

const app = express();
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api/achievements', achievementRoutes);

async function runTests() {
  console.log('--- Starting Achievement Review Workflow Tests ---');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 1. Seed eligible users
    await db.query(`
      INSERT INTO eligible_users (name, email, department, class, role)
      VALUES 
        ('Teacher Reviewer', 'teacher_rev@classboard.edu', 'CS', 'CS-101', 'teacher'),
        ('Student Submitter', 'student_sub@classboard.edu', 'CS', 'CS-101', 'student')
      ON CONFLICT (email) DO NOTHING;
    `);

    // 2. Signup Teacher & Student
    const teacherRes = await fetch(`${baseUrl}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher_rev@classboard.edu', password: 'Password123!' })
    });
    const teacherData = await teacherRes.json();
    const teacherToken = teacherData.token;

    const studentRes = await fetch(`${baseUrl}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student_sub@classboard.edu', password: 'Password123!' })
    });
    const studentData = await studentRes.json();
    const studentToken = studentData.token;

    console.log('✓ Teacher and Student registered.');

    // 3. Student submits achievement
    const addAchRes = await fetch(`${baseUrl}/achievements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        title: 'Built AI Classifier',
        category: 'project',
        description: 'Image classification model using TensorFlow',
        link: 'https://github.com/student/ai-classifier'
      })
    });
    const addAchData = await addAchRes.json();
    const achId = addAchData.achievement.id;
    console.log(`✓ Student submitted achievement #${achId} with status: '${addAchData.achievement.status}'`);

    // 4. Teacher fetches pending achievements
    const pendingRes = await fetch(`${baseUrl}/achievements/pending`, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const pendingData = await pendingRes.json();
    console.log(`✓ Teacher fetched pending count: ${pendingData.pending_achievements.length}`);

    // 5. Teacher reviews achievement (Approves with feedback)
    const reviewRes = await fetch(`${baseUrl}/achievements/${achId}/review`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${teacherToken}`
      },
      body: JSON.stringify({
        status: 'approved',
        teacher_feedback: 'Outstanding project!'
      })
    });
    const reviewData = await reviewRes.json();
    console.log(`✓ Teacher approved achievement #${achId}. Status: '${reviewData.achievement.status}', Feedback: '${reviewData.achievement.teacher_feedback}'`);

    // 6. Student verifies updated status and feedback
    const myAchRes = await fetch(`${baseUrl}/achievements/me`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const myAchData = await myAchRes.json();
    console.log(`✓ Student verified status: '${myAchData.achievements[0].status}'`);

    console.log('--- ALL ACHIEVEMENT REVIEW TESTS PASSED SUCCESSFULLY ---');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
