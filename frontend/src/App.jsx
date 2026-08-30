import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000';

function App() {
  const [activeTab, setActiveTab] = useState('login'); // 'login', 'signup', 'dashboard'
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userData, setUserData] = useState(null);
  const [achievements, setAchievements] = useState([]);
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

  // Achievement form state
  const [achievementForm, setAchievementForm] = useState({
    title: '',
    category: 'project',
    description: '',
    link: ''
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
        if (data.user.role === 'student') {
          fetchMyAchievements(authToken);
        }
      } else {
        setErrorMessage(data.message || 'Session expired. Please log in again.');
        logout();
      }
    } catch (err) {
      setErrorMessage('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAchievements = async (authToken) => {
    try {
      const res = await fetch(`${API_BASE}/achievements/me`, {
        headers: {
          'Authorization': `Bearer ${authToken || token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setAchievements(data.achievements || []);
      }
    } catch (err) {
      console.error('Error fetching achievements:', err);
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
        if (data.user.role === 'student') {
          fetchMyAchievements(data.token);
        }
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
        if (data.user.role === 'student') {
          fetchMyAchievements(data.token);
        }
      } else {
        setErrorMessage(data.message || 'Signup failed.');
      }
    } catch (err) {
      setErrorMessage('Network error during signup.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAchievement = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/achievements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(achievementForm)
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Achievement added successfully!');
        setAchievementForm({ title: '', category: 'project', description: '', link: '' });
        fetchMyAchievements(token);
      } else {
        setErrorMessage(data.message || 'Failed to add achievement.');
      }
    } catch (err) {
      setErrorMessage('Error adding achievement.');
    }
  };

  const handleDeleteAchievement = async (id) => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/achievements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Achievement deleted successfully.');
        setAchievements(achievements.filter(ach => ach.id !== id));
      } else {
        setErrorMessage(data.message || 'Failed to delete achievement.');
      }
    } catch (err) {
      setErrorMessage('Error deleting achievement.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUserData(null);
    setAchievements([]);
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
            Dashboard
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

        {/* PROTECTED DASHBOARD TAB */}
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

            {/* STUDENT ACHIEVEMENTS SECTION */}
            {userData.role === 'student' && (
              <>
                <h3 className="section-title">My Achievements</h3>

                {achievements.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No achievements added yet.
                  </p>
                ) : (
                  <div className="achievements-list">
                    {achievements.map((ach) => (
                      <div key={ach.id} className="achievement-card">
                        <div className="achievement-header">
                          <span className="achievement-title">{ach.title}</span>
                          <span className={`achievement-category cat-${ach.category}`}>
                            {ach.category}
                          </span>
                        </div>
                        {ach.description && (
                          <div className="achievement-desc">{ach.description}</div>
                        )}
                        <div className="achievement-footer">
                          {ach.link ? (
                            <a
                              href={ach.link.startsWith('http') ? ach.link : `https://${ach.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="achievement-link"
                            >
                              🔗 View Link
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No link</span>
                          )}
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteAchievement(ach.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ADD ACHIEVEMENT FORM */}
                <div className="add-achievement-box">
                  <h4 style={{ marginBottom: '1rem', color: '#f8fafc' }}>Add New Achievement</h4>
                  <form onSubmit={handleAddAchievement}>
                    <div className="form-group">
                      <label className="form-label">Title</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Winner at Hackathon 2026"
                        value={achievementForm.title}
                        onChange={(e) => setAchievementForm({ ...achievementForm, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={achievementForm.category}
                        onChange={(e) => setAchievementForm({ ...achievementForm, category: e.target.value })}
                      >
                        <option value="project">Project</option>
                        <option value="internship">Internship</option>
                        <option value="certification">Certification</option>
                        <option value="hackathon">Hackathon</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Brief summary of the achievement"
                        value={achievementForm.description}
                        onChange={(e) => setAchievementForm({ ...achievementForm, description: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Link (optional)</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://github.com/... or credential URL"
                        value={achievementForm.link}
                        onChange={(e) => setAchievementForm({ ...achievementForm, link: e.target.value })}
                      />
                    </div>

                    <button type="submit" className="btn-primary">
                      + Add Achievement
                    </button>
                  </form>
                </div>
              </>
            )}

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
