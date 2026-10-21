import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { readError } from '../api/client';

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [registerNo, setRegisterNo] = useState('');
  const [department, setDepartment] = useState('');
  const [classSection, setClassSection] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/auth/meta')
      .then((res) => {
        setDepartments(res.data.departments || []);
        setClasses(res.data.classes || []);
      })
      .catch(() => {
        // Fallback silently if offline or endpoint unavailable
      });
  }, []);

  if (user) return <Navigate to="/" replace />;

  const handleClassChange = (selectedClassId) => {
    setClassSection(selectedClassId);
    if (!selectedClassId) return;
    const found = classes.find((c) => c._id === selectedClassId);
    if (found && found.department) {
      const deptId = typeof found.department === 'object' ? found.department._id : found.department;
      if (deptId && !department) {
        setDepartment(deptId);
      }
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const trimmedName = name.trim();
    const trimmedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName) {
      setError('Full name is required');
      return;
    }
    if (!trimmedEmail) {
      setError('College email is required');
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        password,
        confirmPassword,
        rollNo: rollNo.trim().toUpperCase() || undefined,
        registerNo: registerNo.trim() || undefined,
        department: department || undefined,
        classSection: classSection || undefined,
      };

      await api.post('/auth/register', payload);

      setSuccess('Registration successful! Redirecting to login…');
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            message: 'Registration successful! You can now sign in with your college email.',
            email: trimmedEmail,
          },
        });
      }, 1500);
    } catch (err) {
      setError(readError(err));
      setBusy(false);
    }
  };

  // Filter classes by department if department is selected
  const visibleClasses = department
    ? classes.filter((c) => {
        const dId = typeof c.department === 'object' ? c.department._id : c.department;
        return dId === department;
      })
    : classes;

  return (
    <div className="login-shell">
      <section className="login-side">
        <h1>Every OD and leave, on one register.</h1>
        <p>
          Student registration gives you instant access to submit OD and leave requests, track
          faculty approvals, and view your automated attendance register.
        </p>
        <div className="login-ledger">
          <div>
            <span>Student registers</span>
            <span>1</span>
          </div>
          <div>
            <span>Instant student access</span>
            <span>2</span>
          </div>
          <div>
            <span>Direct tutor link</span>
            <span>3</span>
          </div>
          <div>
            <span>Real-time attendance record</span>
            <span>4</span>
          </div>
        </div>
      </section>

      <section className="login-main">
        <div className="login-card" style={{ maxWidth: '440px' }}>
          <h2>Student registration</h2>
          <p style={{ color: 'var(--ink-soft)' }}>
            Create your student account to apply for OD and leave.
          </p>

          {error && <div className="note error">{error}</div>}
          {success && <div className="note good">{success}</div>}

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="reg-name">Full name *</label>
              <input
                id="reg-name"
                type="text"
                value={name}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priyadharshini K"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="reg-email">College email *</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. 21cs015@college.edu"
                required
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="reg-roll">Roll number</label>
                <input
                  id="reg-roll"
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="e.g. 21CS015"
                />
              </div>

              <div className="field">
                <label htmlFor="reg-regno">Register number</label>
                <input
                  id="reg-regno"
                  type="text"
                  value={registerNo}
                  onChange={(e) => setRegisterNo(e.target.value)}
                  placeholder="e.g. 9192015"
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="reg-dept">Department</label>
                <select
                  id="reg-dept"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                  }}
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.code ? `${d.code} — ` : ''}
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="reg-class">Class / Section</label>
                <select
                  id="reg-class"
                  value={classSection}
                  onChange={(e) => handleClassChange(e.target.value)}
                >
                  <option value="">Select class section</option>
                  {visibleClasses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="reg-password">Password *</label>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="reg-confirm">Confirm password *</label>
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '18px',
                marginTop: '-4px',
              }}
            >
              <input
                type="checkbox"
                id="reg-showpass"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
              />
              <label
                htmlFor="reg-showpass"
                style={{
                  margin: 0,
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: 'var(--ink-soft)',
                }}
              >
                Show passwords
              </label>
            </div>

            <button type="submit" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Creating account…' : 'Create student account'}
            </button>
          </form>

          <p
            style={{
              marginTop: '16px',
              fontSize: '14px',
              textAlign: 'center',
              color: 'var(--ink-soft)',
            }}
          >
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>
              Login here
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
