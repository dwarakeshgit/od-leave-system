import { useEffect, useState } from 'react';
import api, { readError } from '../api/client';

const BLANK = {
  name: '',
  email: '',
  password: '',
  role: 'student',
  rollNo: '',
  registerNo: '',
  year: 3,
  phone: '',
  parentPhone: '',
  department: '',
  classSection: '',
};

export default function People() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [roleFilter, setRoleFilter] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadUsers = () => {
    const params = {};
    if (roleFilter) params.role = roleFilter;
    if (q) params.q = q;
    api
      .get('/admin/users', { params })
      .then((res) => setUsers(res.data))
      .catch((err) => setError(readError(err)));
  };

  useEffect(() => {
    api.get('/admin/departments').then((res) => setDepartments(res.data)).catch(() => {});
    api.get('/admin/classes').then((res) => setClasses(res.data)).catch(() => {});
  }, []);

  useEffect(loadUsers, [roleFilter, q]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = { ...form };
      if (payload.role !== 'student') {
        delete payload.rollNo;
        delete payload.classSection;
        delete payload.year;
      }
      await api.post('/admin/users', payload);
      setMessage(`${form.name} added. They can sign in with the password you set.`);
      setForm(BLANK);
      loadUsers();
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (user) => {
    try {
      await api.delete(`/admin/users/${user._id}`);
      setMessage(`${user.name} can no longer sign in.`);
      loadUsers();
    } catch (err) {
      setError(readError(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Students and staff</h1>
          <p>Accounts, roll numbers and which class each student belongs to.</p>
        </div>
      </div>

      {error && <div className="note error">{error}</div>}
      {message && <div className="note good">{message}</div>}

      <form className="sheet" onSubmit={submit}>
        <h3>Add someone</h3>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" value={form.name} onChange={set('name')} required />
          </div>
          <div className="field">
            <label htmlFor="email">College email</label>
            <input id="email" type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="field">
            <label htmlFor="password">Starting password</label>
            <input
              id="password"
              value={form.password}
              onChange={set('password')}
              minLength={6}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="role">Role</label>
            <select id="role" value={form.role} onChange={set('role')}>
              <option value="student">Student</option>
              <option value="tutor">Class tutor</option>
              <option value="hod">Head of department</option>
              <option value="admin">Office</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="department">Department</label>
            <select id="department" value={form.department} onChange={set('department')}>
              <option value="">Not set</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" value={form.phone} onChange={set('phone')} />
          </div>

          {form.role === 'student' && (
            <>
              <div className="field">
                <label htmlFor="rollNo">Roll number</label>
                <input id="rollNo" value={form.rollNo} onChange={set('rollNo')} required />
              </div>
              <div className="field">
                <label htmlFor="classSection">Class</label>
                <select id="classSection" value={form.classSection} onChange={set('classSection')}>
                  <option value="">Not set</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="parentPhone">Parent phone</label>
                <input id="parentPhone" value={form.parentPhone} onChange={set('parentPhone')} />
              </div>
            </>
          )}
        </div>
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Add account'}
        </button>
      </form>

      <div className="sheet">
        <div className="grid-3" style={{ marginBottom: 14 }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="search">Search</label>
            <input id="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or roll" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="roleFilter">Role</label>
            <select id="roleFilter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Everyone</option>
              <option value="student">Students</option>
              <option value="tutor">Tutors</option>
              <option value="hod">HODs</option>
              <option value="admin">Office</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Roll no</th>
                <th>Class</th>
                <th>Email</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} style={{ opacity: u.active ? 1 : 0.5 }}>
                  <td>{u.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                  <td className="num">{u.rollNo || '–'}</td>
                  <td>{u.classSection ? u.classSection.name : '–'}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.active && (
                      <button className="ghost small" onClick={() => deactivate(u)}>
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
