import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const ROLE_LABEL = {
  student: 'Student',
  tutor: 'Class tutor',
  hod: 'Head of department',
  admin: 'Office',
};

function linksFor(role) {
  if (role === 'student') {
    return [
      { to: '/', label: 'Overview', end: true },
      { to: '/new-request', label: 'Apply for OD or leave' },
      { to: '/my-requests', label: 'My requests' },
      { to: '/my-attendance', label: 'My attendance' },
      { to: '/notifications', label: 'Updates' },
    ];
  }
  if (role === 'tutor' || role === 'hod') {
    return [
      { to: '/', label: 'Overview', end: true },
      { to: '/approvals', label: 'Approvals', key: 'pending' },
      { to: '/requests', label: 'All requests' },
      { to: '/attendance', label: 'Mark attendance' },
      { to: '/reports', label: 'Attendance report' },
      { to: '/notifications', label: 'Updates' },
    ];
  }
  return [
    { to: '/', label: 'Overview', end: true },
    { to: '/requests', label: 'All requests' },
    { to: '/people', label: 'Students and staff' },
    { to: '/classes', label: 'Classes' },
    { to: '/reports', label: 'Attendance report' },
    { to: '/audit', label: 'Activity log' },
  ];
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user.role !== 'tutor' && user.role !== 'hod') return;
    api
      .get('/requests/pending')
      .then((res) => setPendingCount(res.data.length))
      .catch(() => setPendingCount(0));
  }, [user.role, location.pathname]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          OD &amp; Leave Desk
          <span>{user.department ? user.department.name : 'Campus'}</span>
        </div>

        <nav className="nav">
          {linksFor(user.role).map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
              {link.key === 'pending' && pendingCount > 0 && (
                <span className="badge">{pendingCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <strong>{user.name}</strong>
          {ROLE_LABEL[user.role]}
          {user.rollNo ? ` · ${user.rollNo}` : ''}
          <br />
          <button className="linkish" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
