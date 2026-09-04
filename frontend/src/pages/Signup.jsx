import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [matchedUser, setMatchedUser] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (val) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const getPasswordValidationErrors = (pwd) => {
    const missing = [];
    if (pwd.length < 6) {
      missing.push('at least 6 characters');
    }
    if (!/[A-Z]/.test(pwd)) {
      missing.push('at least one uppercase letter');
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd) && !/[^A-Za-z0-9]/.test(pwd)) {
      missing.push('at least one special character (!@#$%^&*)');
    }
    return missing;
  };

  const checkEligibility = async (emailToVerify) => {
    if (!validateEmail(emailToVerify)) {
      setMatchedUser(null);
      return;
    }

    setCheckingEmail(true);
    setEmailError('');
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE}/check-eligibility?email=${encodeURIComponent(emailToVerify.trim())}`);
      const data = await res.json();

      if (res.ok && data.eligible) {
        setMatchedUser(data.user);
      } else {
        setMatchedUser(null);
        setEmailError(data.message || 'This email is not registered with your institution.');
      }
    } catch (err) {
      console.error('Eligibility check error:', err);
      setMatchedUser(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setMatchedUser(null);
    setEmailError('');
    setErrorMessage('');
  };

  const handleEmailBlur = () => {
    if (email.trim() && validateEmail(email)) {
      checkEligibility(email);
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordError) {
      const missing = getPasswordValidationErrors(val);
      if (missing.length === 0) {
        setPasswordError('');
      } else {
        setPasswordError(`Password requires: ${missing.join(', ')}.`);
      }
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setEmailError('');
    setPasswordError('');

    let hasError = false;

    if (!email.trim() || !validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      hasError = true;
    }

    const missingPasswordReqs = getPasswordValidationErrors(password);
    if (missingPasswordReqs.length > 0) {
      setPasswordError(`Password requires: ${missingPasswordReqs.join(', ')}.`);
      hasError = true;
    }

    if (!matchedUser && !hasError) {
      await checkEligibility(email);
      if (!matchedUser) {
        return;
      }
    }

    if (hasError) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        setErrorMessage(data.message || 'Signup failed.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setErrorMessage('Network error during signup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '520px' }}>
      <div className="card">
        <div className="brand-header">
          <h1 className="brand-title">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            ClassBoard
          </h1>
          <p className="brand-subtitle">Student & Teacher Dashboard System</p>
        </div>

        <h2 className="page-heading">Create Account</h2>

        {errorMessage && (
          <div className="error-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSignup} noValidate>
          <div className="form-group">
            <label className="form-label">Official Email Address</label>
            <input
              type="email"
              className={`form-input ${emailError ? 'input-error' : ''}`}
              placeholder="user@classboard.edu"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              required
            />
            {checkingEmail && (
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                Verifying institutional eligibility...
              </small>
            )}
            {emailError && (
              <div className="field-error-text">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {emailError}
              </div>
            )}
          </div>

          {matchedUser && (
            <div style={{
              background: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--primary, #3b82f6)' }}>
                ✓ Verified Institution Profile
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div><strong>Name:</strong> {matchedUser.name}</div>
                <div><strong>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{matchedUser.role}</span></div>
                <div><strong>Department:</strong> {matchedUser.department}</div>
                <div><strong>Class:</strong> {matchedUser.class}</div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-toggle">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${passwordError ? 'input-error' : ''}`}
                placeholder="Min 6 chars, 1 uppercase, 1 special (!@#$%^&*)"
                value={password}
                onChange={handlePasswordChange}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {passwordError && (
              <div className="field-error-text">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {passwordError}
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.75rem' }}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
