import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000';

function App() {
  const [activeTab, setActiveTab] = useState('login'); // 'login', 'signup', 'dashboard'
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userData, setUserData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
    class: ''
  });

  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
    }
  }, [token]);

  const fetchUserProfile = async (authToken) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(data.user);
        setActiveTab('dashboard');
      } else {
        // Token invalid or expired
        setErrorMessage(data.message || 'Session expired. Please log in again.');
        logout();
      }
    } catch (err) {
      setErrorMessage('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUserData(data.user);
        setSuccessMessage('Logged in successfully!');
        setActiveTab('dashboard');
      } else {
        setErrorMessage(data.message || 'Login failed.');
      }
    } catch (err) {
      setErrorMessage('Network error during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm)
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUserData(data.user);
        setSuccessMessage('Account created successfully!');
        setActiveTab('dashboard');
      } else {
        setErrorMessage(data.message || 'Signup failed.');
      }
    } catch (err) {
      setErrorMessage('Network error during signup.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUserData(null);
    setActiveTab('login');
  };

  return (
    <div className="container">
      <div className="card">
        <div className="brand-header">
          <h1 className="brand-title">ClassBoard</h1>
          <p className="brand-subtitle">Student & Teacher Dashboard System</p>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setErrorMessage(''); setSuccessMessage(''); }}
          >
            Login
          </button>
          <button
            className={`nav-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => { setActiveTab('signup'); setErrorMessage(''); setSuccessMessage(''); }}
          >
            Sign Up
          </button>
          <button
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              if (token) {
                fetchUserProfile(token);
              } else {
                setErrorMessage('Please login or signup first.');
              }
            }}
          >
            Profile (/me)
          </button>
        </div>

        {/* Error / Success Badges */}
        {errorMessage && <div className="error-badge">{errorMessage}</div>}
        {successMessage && <div className="success-badge">{successMessage}</div>}

        {/* LOGIN TAB */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="teacher@classboard.edu or student@classboard.edu"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        )}

        {/* SIGNUP TAB */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label className="form-label">Select Role</label>
              <div className="role-selector">
                <div
                  className={`role-option ${signupForm.role === 'student' ? 'selected' : ''}`}
                  onClick={() => setSignupForm({ ...signupForm, role: 'student' })}
                >
                  Student
                </div>
                <div
                  className={`role-option ${signupForm.role === 'teacher' ? 'selected' : ''}`}
                  onClick={() => setSignupForm({ ...signupForm, role: 'teacher' })}
                >
                  Teacher
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={signupForm.name}
                onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="user@classboard.edu"
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Create strong password"
                value={signupForm.password}
                onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-input"
                placeholder="Computer Science"
                value={signupForm.department}
                onChange={(e) => setSignupForm({ ...signupForm, department: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Class / Grade</label>
              <input
                type="text"
                className="form-input"
                placeholder="CS-101 or Grade 10"
                value={signupForm.class}
                onChange={(e) => setSignupForm({ ...signupForm, class: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : `Sign Up as ${signupForm.role === 'teacher' ? 'Teacher' : 'Student'}`}
            </button>
          </form>
        )}

        {/* PROTECTED DASHBOARD (/me) TAB */}
        {activeTab === 'dashboard' && userData && (
          <div className="user-profile">
            <div className="profile-header">
              <div>
                <div className="profile-name">{userData.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>ID: #{userData.id}</div>
              </div>
              <span className={`role-pill ${userData.role}`}>
                {userData.role}
              </span>
            </div>

            <div className="profile-row">
              <span className="profile-label">Email</span>
              <span className="profile-value">{userData.email}</span>
            </div>

            <div className="profile-row">
              <span className="profile-label">Department</span>
              <span className="profile-value">{userData.department}</span>
            </div>

            <div className="profile-row">
              <span className="profile-label">Class</span>
              <span className="profile-value">{userData.class}</span>
            </div>

            <div className="profile-row">
              <span className="profile-label">Joined</span>
              <span className="profile-value">
                {userData.created_at ? new Date(userData.created_at).toLocaleDateString() : 'Just now'}
              </span>
            </div>

            <button className="btn-secondary" onClick={logout}>
              Log Out
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && !userData && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No active session found. Please log in or sign up.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
