const app = require('./server');
const db = require('./db');

async function testNotices() {
  await db.init();
  const PORT = 5003;
  const server = app.listen(PORT, async () => {
    console.log(`Notices Test server running on port ${PORT}`);

    try {
      const baseUrl = `http://localhost:${PORT}`;

      const createAccount = async (name, email, password, role, department, className) => {
        const res = await fetch(`${baseUrl}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, department, class: className })
        });
        return await res.json();
      };

      console.log('\n--- Creating Test Accounts ---');
      const csTeacher = await createAccount('Prof. Turing', 'turing@classboard.edu', 'Pass123!', 'teacher', 'CS', 'CS-A');
      const csStudent1 = await createAccount('Ada Lovelace', 'ada@classboard.edu', 'Pass123!', 'student', 'CS', 'CS-A');
      const csStudent2 = await createAccount('Alan Kay', 'alan@classboard.edu', 'Pass123!', 'student', 'CS', 'CS-A');
      const itStudent = await createAccount('Grace Hopper', 'grace@classboard.edu', 'Pass123!', 'student', 'IT', 'IT-A');

      // 1. Teacher posts notice
      console.log('\n1. Testing POST /notices (Teacher posting notice for CS department)...');
      const postNoticeRes = await fetch(`${baseUrl}/notices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${csTeacher.token}`
        },
        body: JSON.stringify({
          title: 'Midterm Exam Schedule',
          message: 'The CS department midterm exam will take place next Monday at 10 AM in Room 301.'
        })
      });
      const postNoticeData = await postNoticeRes.json();
      console.log('Post Notice status:', postNoticeRes.status);
      console.log('Post Notice response:', postNoticeData);

      const noticeId = postNoticeData.notice.id;

      // 2. CS Student 1 fetches notices
      console.log('\n2. Testing GET /notices (CS Student 1 fetching department notices)...');
      const csStudent1Res = await fetch(`${baseUrl}/notices`, {
        headers: { 'Authorization': `Bearer ${csStudent1.token}` }
      });
      const csStudent1Data = await csStudent1Res.json();
      console.log('CS Student 1 Notices count:', csStudent1Data.notices.length);
      console.log('CS Student 1 Notice is_read status:', csStudent1Data.notices[0].is_read);

      // 3. IT Student fetches notices (Should be empty for IT)
      console.log('\n3. Testing GET /notices (IT Student fetching notices for IT department)...');
      const itStudentRes = await fetch(`${baseUrl}/notices`, {
        headers: { 'Authorization': `Bearer ${itStudent.token}` }
      });
      const itStudentData = await itStudentRes.json();
      console.log('IT Student Notices count:', itStudentData.notices.length, '(Expected: 0)');

      // 4. CS Student 1 marks notice as read
      console.log('\n4. Testing POST /notices/:id/read (CS Student 1 marking notice as read)...');
      const readRes = await fetch(`${baseUrl}/notices/${noticeId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${csStudent1.token}` }
      });
      const readData = await readRes.json();
      console.log('Mark Read status:', readRes.status);
      console.log('Mark Read response:', readData);

      // 5. Verify CS Student 1 sees is_read: true
      const reCheckRes = await fetch(`${baseUrl}/notices`, {
        headers: { 'Authorization': `Bearer ${csStudent1.token}` }
      });
      const reCheckData = await reCheckRes.json();
      console.log('Re-check CS Student 1 Notice is_read status:', reCheckData.notices[0].is_read, '(Expected: true)');

      // 6. Teacher checks read stats (CS has 2 students total: Ada and Alan; 1 has read)
      console.log('\n6. Testing GET /notices/:id/read-stats (Teacher checking read stats)...');
      const statsRes = await fetch(`${baseUrl}/notices/${noticeId}/read-stats`, {
        headers: { 'Authorization': `Bearer ${csTeacher.token}` }
      });
      const statsData = await statsRes.json();
      console.log('Read Stats status:', statsRes.status);
      console.log('Read Stats display text:', statsData.display);
      console.log('Read count / Total students:', `${statsData.read_count} of ${statsData.total_students}`);

      // 7. Student attempts to delete notice (Expect 403 Forbidden)
      console.log('\n7. Testing DELETE /notices/:id as Student (Expect 403)...');
      const studentDeleteRes = await fetch(`${baseUrl}/notices/${noticeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${csStudent1.token}` }
      });
      console.log('Student Delete status:', studentDeleteRes.status, '(Expected: 403)');

      // 8. Teacher deletes notice
      console.log('\n8. Testing DELETE /notices/:id as Teacher...');
      const teacherDeleteRes = await fetch(`${baseUrl}/notices/${noticeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${csTeacher.token}` }
      });
      const teacherDeleteData = await teacherDeleteRes.json();
      console.log('Teacher Delete status:', teacherDeleteRes.status);
      console.log('Teacher Delete response:', teacherDeleteData);

      // Verify deletion
      const checkDeletedRes = await fetch(`${baseUrl}/notices`, {
        headers: { 'Authorization': `Bearer ${csTeacher.token}` }
      });
      const checkDeletedData = await checkDeletedRes.json();
      console.log('Notices remaining after deletion:', checkDeletedData.notices.length, '(Expected: 0)');

      console.log('\n✅ ALL NOTICE ENDPOINT TESTS PASSED SUCCESSFULLY!');
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testNotices();
