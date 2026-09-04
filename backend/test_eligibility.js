const db = require('./db');
const seedEligibleUsers = require('./seed_eligible');

async function testEligibilityFlow() {
  console.log('--- Starting Eligibility & Signup Test ---');
  await db.init();
  await seedEligibleUsers();

  // Test 1: Check unregistered email
  console.log('1. Testing non-eligible email eligibility check...');
  const check1 = await db.query('SELECT * FROM eligible_users WHERE email = $1', ['unregistered@example.com']);
  if (check1.rows.length !== 0) throw new Error('Expected no rows for unregistered email');

  // Test 2: Check registered email
  console.log('2. Testing eligible email check...');
  const check2 = await db.query('SELECT name, role, department, class FROM eligible_users WHERE email = $1', ['alice.smith@classboard.edu']);
  if (check2.rows.length === 0 || check2.rows[0].name !== 'Alice Smith') throw new Error('Eligible user not found');

  // Test 3: Insert user into users using eligible profile
  console.log('3. Inserting user into users table...');
  const eligible = check2.rows[0];
  await db.query(
    'INSERT INTO users (name, email, password_hash, role, department, class) VALUES ($1, $2, $3, $4, $5, $6)',
    [eligible.name, 'alice.smith@classboard.edu', 'hashed_pwd', eligible.role, eligible.department, eligible.class]
  );

  // Test 4: Check existing user in users table
  console.log('4. Testing duplicate check in users table...');
  const existing = await db.query('SELECT id FROM users WHERE email = $1', ['alice.smith@classboard.edu']);
  if (existing.rows.length === 0) throw new Error('Expected existing user to be found');

  console.log('--- ALL TESTS PASSED SUCCESSFULLY ---');
}

testEligibilityFlow().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
