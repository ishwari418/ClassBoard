const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// GET /check-eligibility?email=...
router.get('/check-eligibility', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email query parameter is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists in users table
    const existingUser = await db.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [cleanEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'An account already exists for this email.' });
    }

    // Check if email exists in eligible_users table
    const eligibleResult = await db.query(
      'SELECT name, email, department, class, role FROM eligible_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))',
      [cleanEmail]
    );

    if (eligibleResult.rows.length === 0) {
      return res.status(404).json({
        message: 'This email is not registered with your institution. Please sign up with your official college email.'
      });
    }

    return res.json({
      eligible: true,
      user: eligibleResult.rows[0]
    });
  } catch (err) {
    console.error('Check eligibility error:', err);
    return res.status(500).json({ message: 'Server error checking eligibility.' });
  }
});

// POST /signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.toLowerCase().trim();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    // Prevent duplicate signups
    console.log('Searching for email during signup duplicate check:', cleanEmail);
    const existingUser = await db.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [cleanEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'An account already exists for this email.' });
    }

    // Check if email is in eligible_users table
    console.log('Searching for email in eligible_users:', cleanEmail);
    const eligibleResult = await db.query(
      'SELECT name, department, class, role FROM eligible_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))',
      [cleanEmail]
    );

    if (eligibleResult.rows.length === 0) {
      return res.status(400).json({
        message: 'This email is not registered with your institution. Please sign up with your official college email.'
      });
    }

    const eligibleInfo = eligibleResult.rows[0];

    // Password strength validation (min 6 chars, >= 1 uppercase, >= 1 special char)
    const hasMinLength = password.length >= 6;
    const hasUpper = /[A-Z]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password) || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasMinLength || !hasUpper || !hasSpecial) {
      const missing = [];
      if (!hasMinLength) missing.push('at least 6 characters');
      if (!hasUpper) missing.push('at least one uppercase letter');
      if (!hasSpecial) missing.push('at least one special character (!@#$%^&*)');
      return res.status(400).json({
        message: `Password must contain ${missing.join(', ')}.`
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user auto-filling details from eligible_users
    const insertQuery = `
      INSERT INTO users (name, email, password_hash, role, department, class)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, department, class, created_at
    `;
    const result = await db.query(insertQuery, [
      eligibleInfo.name,
      cleanEmail,
      passwordHash,
      eligibleInfo.role,
      eligibleInfo.department,
      eligibleInfo.class
    ]);

    const newUser = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'User created successfully',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Server error during signup.' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      class: user.class,
      created_at: user.created_at
    };

    return res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /me (Protected Route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, role, department, class, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Get /me error:', err);
    return res.status(500).json({ message: 'Server error fetching user data.' });
  }
});

module.exports = router;
