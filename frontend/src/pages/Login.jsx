import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { readError } from '../api/client';

const DEMO = [
  ['Student', '21cs001@college.edu', 'student123'],
  ['Class tutor', 'tutor@college.edu', 'tutor123'],
  ['HOD', 'hod@college.edu', 'hod123'],
  ['Office', 'admin@college.edu', 'admin123'],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.message || '');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <section className="login-side">
        <h1>Every OD and leave, on one register.</h1>
        <p>
          Requests go straight to your class tutor, then the HOD. Once approved, the attendance
          register updates itself — nobody has to chase a WhatsApp message.
        </p>
        <div className="login-ledger">
          <div>
            <span>Student applies</span>
            <span>1</span>
          </div>
          <div>
            <span>Class tutor verifies</span>
            <span>2</span>
          </div>
          <div>
            <span>HOD approves</span>
            <span>3</span>
          </div>
          <div>
            <span>Attendance updates automatically</span>
            <span>4</span>
          </div>
        </div>
      </section>

      <section className="login-main">
        <div className="login-card">
          <h2>Sign in</h2>
          <p style={{ color: 'var(--ink-soft)' }}>Use your college email address.</p>

          {error && <div className="note error">{error}</div>}
          {success && <div className="note good">{success}</div>}

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">College email</label>
              <input
                id="email"
                type="email"
                value={email}
                autoComplete="username"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: '16px', fontSize: '14px', textAlign: 'center', color: 'var(--ink-soft)' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ fontWeight: 600 }}>
              Register here
            </Link>
          </p>

          <div className="demo-keys">
            Demo accounts from the seed data:
            {DEMO.map(([label, mail, pass]) => (
              <div key={mail}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(mail);
                    setPassword(pass);
                  }}
                >
                  {label}
                </button>{' '}
                — {mail}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
