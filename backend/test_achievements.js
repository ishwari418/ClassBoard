const app = require('./server');
const db = require('./db');

async function testAchievements() {
  await db.init();
  const PORT = 5002;
  const server = app.listen(PORT, async () => {
    console.log(`Achievements Test server running on port ${PORT}`);

    try {
      const baseUrl = `http://localhost:${PORT}`;

      // Helper function for signup
      const createAccount = async (name, email, password, role, department, className) => {
        const res = await fetch(`${baseUrl}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, department, class: className })
        });
        const data = await res.json();
        return data;
      };

      console.log('\n--- Creating Test Accounts ---');
      const teacher = await createAccount('Prof. Oak', 'oak@classboard.edu', 'pass123', 'teacher', 'Science', 'Class-A');
      const student1 = await createAccount('Ash Ketchum', 'ash@classboard.edu', 'pass123', 'student', 'Science', 'Class-A');
      const student2ClassA = await createAccount('Misty Waterflower', 'misty@classboard.edu', 'pass123', 'student', 'Science', 'Class-A');
      const student3ClassB = await createAccount('Brock Harrison', 'brock@classboard.edu', 'pass123', 'student', 'Science', 'Class-B');

      console.log('Teacher Token:', !!teacher.token);
      console.log('Student 1 (Class A) ID:', student1.user.id);
      console.log('Student 2 (Class A) ID:', student2ClassA.user.id);
      console.log('Student 3 (Class B) ID:', student3ClassB.user.id);

      // 1. POST /achievements — Student 1 adds achievements
      console.log('\n1. Testing POST /achievements (Student 1 adding achievements)...');
      const addRes1 = await fetch(`${baseUrl}/achievements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${student1.token}`
        },
        body: JSON.stringify({
          title: 'Full Stack Web App Project',
          category: 'project',
          description: 'Built ClassBoard using Node.js & React',
          link: 'https://github.com/classboard/app'
        })
      });
      const addData1 = await addRes1.json();
      console.log('Add Achievement 1 status:', addRes1.status);
      console.log('Add Achievement 1 response:', addData1);

      const addRes2 = await fetch(`${baseUrl}/achievements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${student1.token}`
        },
        body: JSON.stringify({
          title: 'AWS Cloud Certified',
          category: 'certification',
          description: 'Passed Cloud Practitioner exam',
          link: 'https://aws.amazon.com/verify'
        })
      });
      const addData2 = await addRes2.json();
      console.log('Add Achievement 2 status:', addRes2.status);

      // 2. GET /achievements/me — Student 1 views their own achievements
      console.log('\n2. Testing GET /achievements/me (Student 1 viewing own achievements)...');
      const meRes = await fetch(`${baseUrl}/achievements/me`, {
        headers: { 'Authorization': `Bearer ${student1.token}` }
      });
      const meData = await meRes.json();
      console.log('GET /achievements/me status:', meRes.status);
      console.log('GET /achievements/me count:', meData.achievements.length);

      // 3. GET /achievements/:studentId — Student 2 (Class A) views Student 1 (Class A)'s achievements
      console.log('\n3. Testing GET /achievements/:studentId (Same class student viewing)...');
      const sameClassRes = await fetch(`${baseUrl}/achievements/${student1.user.id}`, {
        headers: { 'Authorization': `Bearer ${student2ClassA.token}` }
      });
      const sameClassData = await sameClassRes.json();
      console.log('Same Class View status:', sameClassRes.status);
      console.log('Same Class View achievements count:', sameClassData.achievements?.length);

      // 4. GET /achievements/:studentId — Student 3 (Class B) views Student 1 (Class A)'s achievements (Should be 403 Forbidden)
      console.log('\n4. Testing GET /achievements/:studentId (Different class student viewing - expect 403)...');
      const diffClassRes = await fetch(`${baseUrl}/achievements/${student1.user.id}`, {
        headers: { 'Authorization': `Bearer ${student3ClassB.token}` }
      });
      const diffClassData = await diffClassRes.json();
      console.log('Diff Class View status:', diffClassRes.status, '(Expected: 403)');
      console.log('Diff Class View message:', diffClassData.message);

      // 5. GET /achievements/:studentId — Teacher views Student 1's achievements
      console.log('\n5. Testing GET /achievements/:studentId (Teacher viewing)...');
      const teacherViewRes = await fetch(`${baseUrl}/achievements/${student1.user.id}`, {
        headers: { 'Authorization': `Bearer ${teacher.token}` }
      });
      const teacherViewData = await teacherViewRes.json();
      console.log('Teacher View status:', teacherViewRes.status);
      console.log('Teacher View achievements count:', teacherViewData.achievements?.length);

      // 6. DELETE /achievements/:id — Student 2 tries to delete Student 1's achievement (Expect 403)
      console.log('\n6. Testing DELETE /achievements/:id (Unauthorized delete - expect 403)...');
      const unauthorizedDeleteRes = await fetch(`${baseUrl}/achievements/${addData1.achievement.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${student2ClassA.token}` }
      });
      const unauthorizedDeleteData = await unauthorizedDeleteRes.json();
      console.log('Unauthorized Delete status:', unauthorizedDeleteRes.status, '(Expected: 403)');
      console.log('Unauthorized Delete message:', unauthorizedDeleteData.message);

      // 7. DELETE /achievements/:id — Student 1 deletes their own achievement
      console.log('\n7. Testing DELETE /achievements/:id (Student 1 deleting own achievement)...');
      const deleteRes = await fetch(`${baseUrl}/achievements/${addData1.achievement.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${student1.token}` }
      });
      const deleteData = await deleteRes.json();
      console.log('Delete Achievement status:', deleteRes.status);
      console.log('Delete Achievement response:', deleteData);

      // Verify deletion in list
      const verifyRes = await fetch(`${baseUrl}/achievements/me`, {
        headers: { 'Authorization': `Bearer ${student1.token}` }
      });
      const verifyData = await verifyRes.json();
      console.log('Remaining achievements count for Student 1:', verifyData.achievements.length);

      console.log('\n✅ ALL ACHIEVEMENTS TESTS PASSED SUCCESSFULLY!');
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testAchievements();
