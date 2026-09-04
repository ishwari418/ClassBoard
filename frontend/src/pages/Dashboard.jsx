import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000';

// Inline SVG Icon Helper for Categories & Actions
const CategoryIcon = ({ type }) => {
  switch (type) {
    case 'internship':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      );
    case 'certification':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7"></circle>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </svg>
      );
    case 'hackathon':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      );
    case 'project':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      );
    case 'notice':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
      );
  }
};

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [pendingAchievements, setPendingAchievements] = useState([]);
  const [notices, setNotices] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewFeedback, setReviewFeedback] = useState({});

  // Forms state
  const [achievementForm, setAchievementForm] = useState({
    title: '',
    category: 'project',
    description: '',
    link: ''
  });

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    message: ''
  });

  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchNotices = useCallback(async (role) => {
    try {
      const res = await fetch(`${API_BASE}/notices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const list = data.notices || [];
        setNotices(list);

        // If student, auto-mark unread notices as read when viewed
        if (role === 'student') {
          list.forEach(async (notice) => {
            if (!notice.is_read) {
              try {
                await fetch(`${API_BASE}/notices/${notice.id}/read`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
              } catch (err) {
                console.error('Auto-mark read error:', err);
              }
            }
          });
        }
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    }
  }, [token]);

  const fetchMyAchievements = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/achievements/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAchievements(data.achievements || []);
      }
    } catch (err) {
      console.error('Error fetching achievements:', err);
    }
  }, [token]);

  const fetchPendingAchievements = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/achievements/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPendingAchievements(data.pending_achievements || []);
      }
    } catch (err) {
      console.error('Error fetching pending achievements:', err);
    }
  }, [token]);

  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(data.user);
        fetchNotices(data.user.role);
        if (data.user.role === 'student') {
          fetchMyAchievements();
        } else if (data.user.role === 'teacher') {
          fetchPendingAchievements();
        }
      } else {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setErrorMessage('Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  }, [token, navigate, fetchNotices, fetchMyAchievements]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchUserProfile();
  }, [token, navigate, fetchUserProfile]);

  const handlePostNotice = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/notices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(noticeForm)
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Notice posted successfully!');
        setNoticeForm({ title: '', message: '' });
        fetchNotices('teacher');
      } else {
        setErrorMessage(data.message || 'Failed to post notice.');
      }
    } catch (err) {
      console.error('Notice posting error:', err);
      setErrorMessage('Error posting notice.');
    }
  };

  const handleDeleteNotice = async (id) => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/notices/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Announcement deleted successfully.');
        setNotices(notices.filter(n => n.id !== id));
      } else {
        setErrorMessage(data.message || 'Failed to delete announcement.');
      }
    } catch (err) {
      console.error('Notice delete error:', err);
      setErrorMessage('Error deleting announcement.');
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
        fetchMyAchievements();
      } else {
        setErrorMessage(data.message || 'Failed to add achievement.');
      }
    } catch (err) {
      console.error('Achievement add error:', err);
      setErrorMessage('Error adding achievement.');
    }
  };

  const handleDeleteAchievement = async (id) => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/achievements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage('Achievement deleted successfully.');
        setAchievements(achievements.filter(ach => ach.id !== id));
      } else {
        setErrorMessage(data.message || 'Failed to delete achievement.');
      }
    } catch (err) {
      console.error('Achievement delete error:', err);
      setErrorMessage('Error deleting achievement.');
    }
  };

  const handleReviewAchievement = async (id, status) => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/achievements/${id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          teacher_feedback: reviewFeedback[id] || ''
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(`Achievement ${status} successfully!`);
        setPendingAchievements(pendingAchievements.filter((ach) => ach.id !== id));
      } else {
        setErrorMessage(data.message || 'Failed to review achievement.');
      }
    } catch (err) {
      console.error('Review achievement error:', err);
      setErrorMessage('Error reviewing achievement.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="brand-header">
            <h1 className="brand-title">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              ClassBoard
            </h1>
            <p className="brand-subtitle">Dashboard System</p>
          </div>
          <div className="skeleton-card">
            <div className="skeleton-line medium"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="brand-header">
          <h1 className="brand-title">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            ClassBoard
          </h1>
          <p className="brand-subtitle">Academic & Activity Portal</p>
        </div>

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

        {successMessage && (
          <div className="success-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {successMessage}
          </div>
        )}

        {userData && (
          <div className="user-profile">
            <div className="profile-header">
              <div>
                <div className="profile-name">{userData.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '2px' }}>
                  ID: #{userData.id}
                </div>
              </div>
              <span className={`role-pill ${userData.role}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {userData.role === 'teacher' ? (
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  ) : (
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  )}
                </svg>
                {userData.role}
              </span>
            </div>

            <div className="profile-details-grid">
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
            </div>

            {/* NOTICES SECTION */}
            <h3 className="section-title">
              <span>Department Notices ({userData.department})</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                {notices.length} {notices.length === 1 ? 'Notice' : 'Notices'}
              </span>
            </h3>

            {/* TEACHER POST NOTICE FORM */}
            {userData.role === 'teacher' && (
              <div className="add-achievement-box" style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CategoryIcon type="notice" />
                  Post New Notice
                </h4>
                <form onSubmit={handlePostNotice}>
                  <div className="form-group">
                    <label className="form-label">Notice Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Midterm Exam Schedule"
                      value={noticeForm.title}
                      onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      placeholder="Write your announcement message here..."
                      value={noticeForm.message}
                      onChange={(e) => setNoticeForm({ ...noticeForm, message: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    Post Announcement
                  </button>
                </form>
              </div>
            )}

            {/* NOTICES LIST */}
            {notices.length === 0 ? (
              <div className="empty-state">
                No notices posted for your department yet.
              </div>
            ) : (
              <div className="cards-grid">
                {notices.map((notice) => (
                  <div key={notice.id} className="achievement-card">
                    <div>
                      <div className="achievement-header">
                        <div className="achievement-title-area">
                          <div className="category-icon-box notice">
                            <CategoryIcon type="notice" />
                          </div>
                          <div>
                            <span className="achievement-title">{notice.title}</span>
                          </div>
                        </div>
                        <span className="notice-author">By {notice.teacher_name}</span>
                      </div>

                      <div className="achievement-desc" style={{ marginTop: '0.75rem' }}>
                        {notice.message}
                      </div>
                    </div>

                    <div className="achievement-footer">
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(notice.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>

                      {/* TEACHER READ STATS & DELETE DISPLAY */}
                      {userData.role === 'teacher' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="read-stats-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            {notice.read_count || 0} / {notice.total_students || 0}
                          </span>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteNotice(notice.id)}
                            title="Delete Notice"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}

                      {/* STUDENT READ BADGE */}
                      {userData.role === 'student' && (
                        <span className="read-status-pill">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TEACHER REVIEW PENDING ACHIEVEMENTS SECTION */}
            {userData.role === 'teacher' && (
              <>
                <h3 className="section-title">
                  <span>Pending Student Achievements Review</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                    {pendingAchievements.length} {pendingAchievements.length === 1 ? 'Pending Review' : 'Pending Reviews'}
                  </span>
                </h3>

                {pendingAchievements.length === 0 ? (
                  <div className="empty-state">
                    No pending student achievements to review in your department.
                  </div>
                ) : (
                  <div className="cards-grid">
                    {pendingAchievements.map((ach) => (
                      <div key={ach.id} className="achievement-card">
                        <div>
                          <div className="achievement-header">
                            <div className="achievement-title-area">
                              <div className={`category-icon-box ${ach.category}`}>
                                <CategoryIcon type={ach.category} />
                              </div>
                              <span className="achievement-title">{ach.title}</span>
                            </div>
                            <span className={`achievement-category cat-${ach.category}`}>
                              {ach.category}
                            </span>
                          </div>

                          <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary, #475569)' }}>
                            <strong>Student:</strong> {ach.student_name} ({ach.student_class})
                          </div>

                          {ach.description && (
                            <div className="achievement-desc" style={{ marginTop: '0.5rem' }}>
                              {ach.description}
                            </div>
                          )}

                          {ach.link && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <a
                                href={ach.link.startsWith('http') ? ach.link : `https://${ach.link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="achievement-link"
                              >
                                View Submitted Resource
                              </a>
                            </div>
                          )}

                          <div style={{ marginTop: '0.75rem' }}>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Optional feedback for student..."
                              value={reviewFeedback[ach.id] || ''}
                              onChange={(e) => setReviewFeedback({ ...reviewFeedback, [ach.id]: e.target.value })}
                              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.6rem' }}
                            />
                          </div>
                        </div>

                        <div className="achievement-footer" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
                          <button
                            className="btn-primary"
                            style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
                            onClick={() => handleReviewAchievement(ach.id, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-delete"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
                            onClick={() => handleReviewAchievement(ach.id, 'rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* STUDENT ACHIEVEMENTS SECTION */}
            {userData.role === 'student' && (
              <>
                <h3 className="section-title">
                  <span>My Achievements</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                    {achievements.length} {achievements.length === 1 ? 'Entry' : 'Entries'}
                  </span>
                </h3>

                {achievements.length === 0 ? (
                  <div className="empty-state">
                    No achievements added yet. Use the form below to showcase your work.
                  </div>
                ) : (
                  <div className="cards-grid">
                    {achievements.map((ach) => (
                      <div key={ach.id} className="achievement-card">
                        <div>
                          <div className="achievement-header">
                            <div className="achievement-title-area">
                              <div className={`category-icon-box ${ach.category}`}>
                                <CategoryIcon type={ach.category} />
                              </div>
                              <span className="achievement-title">{ach.title}</span>
                            </div>
                            <span className={`achievement-category cat-${ach.category}`}>
                              {ach.category}
                            </span>
                          </div>
                          {ach.description && (
                            <div className="achievement-desc" style={{ marginTop: '0.75rem' }}>
                              {ach.description}
                            </div>
                          )}

                          {/* STATUS & FEEDBACK DISPLAY */}
                          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                backgroundColor: ach.status === 'approved' ? '#dcfce7' : ach.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                                color: ach.status === 'approved' ? '#166534' : ach.status === 'rejected' ? '#991b1b' : '#92400e'
                              }}>
                                {ach.status || 'pending'}
                              </span>
                            </div>
                            {ach.teacher_feedback && (
                              <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-secondary, #475569)' }}>
                                Teacher Feedback: "{ach.teacher_feedback}"
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="achievement-footer">
                          {ach.link ? (
                            <a
                              href={ach.link.startsWith('http') ? ach.link : `https://${ach.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="achievement-link"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                              </svg>
                              View Resource
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No link</span>
                          )}
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteAchievement(ach.id)}
                            title="Delete Achievement"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ADD ACHIEVEMENT FORM */}
                <div className="add-achievement-box">
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--primary)' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    Add New Achievement
                  </h4>
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add Achievement
                    </button>
                  </form>
                </div>
              </>
            )}

            <button className="btn-secondary" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
