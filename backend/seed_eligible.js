const fs = require('fs');
const path = require('path');
const db = require('./db');

async function seedEligibleUsers(csvFilePath) {
  const filePath = csvFilePath || path.join(__dirname, 'eligible_users.csv');
  if (!fs.existsSync(filePath)) {
    console.error(`CSV file not found at ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    console.log('No data rows found in CSV.');
    return;
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIdx = headers.indexOf('name');
  const emailIdx = headers.indexOf('email');
  const deptIdx = headers.indexOf('department');
  const classIdx = headers.indexOf('class');
  const roleIdx = headers.indexOf('role');

  if (nameIdx === -1 || emailIdx === -1 || deptIdx === -1 || classIdx === -1 || roleIdx === -1) {
    console.error('CSV missing required headers: name, email, department, class, role');
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV line parsing handling optional quotes
    const rawCols = lines[i].split(',').map(col => col.trim().replace(/^"(.*)"$/, '$1'));
    if (rawCols.length < 5) continue;

    const name = rawCols[nameIdx];
    const email = rawCols[emailIdx].toLowerCase();
    const department = rawCols[deptIdx];
    const userClass = rawCols[classIdx];
    const role = rawCols[roleIdx].toLowerCase();

    if (!['teacher', 'student'].includes(role)) {
      console.warn(`Row ${i}: Invalid role '${role}'. Skipping.`);
      skipped++;
      continue;
    }

    try {
      const query = `
        INSERT INTO eligible_users (name, email, department, class, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE 
        SET name = EXCLUDED.name,
            department = EXCLUDED.department,
            class = EXCLUDED.class,
            role = EXCLUDED.role;
      `;
      await db.query(query, [name, email, department, userClass, role]);
      inserted++;
    } catch (err) {
      console.error(`Error inserting ${email}:`, err.message);
      skipped++;
    }
  }

  console.log(`Successfully processed eligible users CSV. Inserted/Updated: ${inserted}, Skipped: ${skipped}`);
}

if (require.main === module) {
  const targetCsv = process.argv[2];
  seedEligibleUsers(targetCsv).then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Error seeding eligible users:', err);
    process.exit(1);
  });
}

module.exports = seedEligibleUsers;
