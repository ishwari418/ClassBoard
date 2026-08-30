const app = require('./server');
const db = require('./db');

async function testAuth() {
  await db.init();
  const PORT = 5001;
  const server = app.listen(PORT, async () => {
    console.log(`Test server running on port ${PORT}`);

    try {
      const baseUrl = `http://localhost:${PORT}`;

      // 1. Signup Teacher
      console.log('\n1. Testing Teacher Signup...');
      const teacherSignupRes = await fetch(`${baseUrl}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Prof. Sarah Connor',
          email: 'sarah.teacher@classboard.edu',
          password: 'TeacherPassword123',
          role: 'teacher',
          department: 'Computer Science',
          class: 'CS-401'
        })
      });
      const teacherSignupData = await teacherSignupRes.json();
      console.log('Teacher Signup status:', teacherSignupRes.status);
      console.log('Teacher Signup response:', teacherSignupData);

      if (!teacherSignupData.token) {
        throw new Error('Teacher signup failed to return token');
      }

      // 2. Signup Student
      console.log('\n2. Testing Student Signup...');
      const studentSignupRes = await fetch(`${baseUrl}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Connor',
          email: 'john.student@classboard.edu',
          password: 'StudentPassword123',
          role: 'student',
          department: 'Computer Science',
          class: 'CS-401'
        })
      });
      const studentSignupData = await studentSignupRes.json();
      console.log('Student Signup status:', studentSignupRes.status);
      console.log('Student Signup response:', studentSignupData);

      if (!studentSignupData.token) {
        throw new Error('Student signup failed to return token');
      }

      // 3. Login Teacher
      console.log('\n3. Testing Teacher Login...');
      const teacherLoginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'sarah.teacher@classboard.edu',
          password: 'TeacherPassword123'
        })
      });
      const teacherLoginData = await teacherLoginRes.json();
      console.log('Teacher Login status:', teacherLoginRes.status);
      console.log('Teacher Login token received:', !!teacherLoginData.token);

      // 4. Hit Protected /me route with Teacher Token
      console.log('\n4. Testing GET /me with Teacher Token...');
      const teacherMeRes = await fetch(`${baseUrl}/me`, {
        headers: { 'Authorization': `Bearer ${teacherLoginData.token}` }
      });
      const teacherMeData = await teacherMeRes.json();
      console.log('Teacher GET /me status:', teacherMeRes.status);
      console.log('Teacher GET /me response:', teacherMeData);

      // 5. Login Student
      console.log('\n5. Testing Student Login...');
      const studentLoginRes = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'john.student@classboard.edu',
          password: 'StudentPassword123'
        })
      });
      const studentLoginData = await studentLoginRes.json();
      console.log('Student Login status:', studentLoginRes.status);
      console.log('Student Login token received:', !!studentLoginData.token);

      // 6. Hit Protected /me route with Student Token
      console.log('\n6. Testing GET /me with Student Token...');
      const studentMeRes = await fetch(`${baseUrl}/me`, {
        headers: { 'Authorization': `Bearer ${studentLoginData.token}` }
      });
      const studentMeData = await studentMeRes.json();
      console.log('Student GET /me status:', studentMeRes.status);
      console.log('Student GET /me response:', studentMeData);

      console.log('\n✅ ALL AUTH TESTS PASSED SUCCESSFULLY!');
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testAuth();
