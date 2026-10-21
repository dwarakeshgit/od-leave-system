import { useEffect, useState } from 'react';
import api, { readError } from '../api/client';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [form, setForm] = useState({
    name: '',
    year: 3,
    section: 'A',
    department: '',
    tutor: '',
    periodsPerDay: 8,
    minAttendance: 75,
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    api.get('/admin/classes').then((res) => setClasses(res.data)).catch((e) => setError(readError(e)));
  };

  useEffect(() => {
    load();
    api.get('/admin/departments').then((res) => setDepartments(res.data)).catch(() => {});
    api.get('/admin/users', { params: { role: 'tutor' } }).then((res) => setTutors(res.data)).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/admin/classes', form);
      setMessage(`${form.name} created.`);
      setForm({ ...form, name: '' });
      load();
    } catch (err) {
      setError(readError(err));
    }
  };

  const assignTutor = async (id, tutor) => {
    try {
      await api.put(`/admin/classes/${id}`, { tutor });
      setMessage('Tutor updated. New requests from this class go to them.');
      load();
    } catch (err) {
      setError(readError(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Classes</h1>
          <p>Each class has one tutor, who is the first approver for every request.</p>
        </div>
      </div>

      {error && <div className="note error">{error}</div>}
      {message && <div className="note good">{message}</div>}

      <form className="sheet" onSubmit={submit}>
        <h3>Create a class</h3>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="name">Display name</label>
            <input id="name" value={form.name} onChange={set('name')} placeholder="CSE III Year - B" required />
          </div>
          <div className="field">
            <label htmlFor="year">Year</label>
            <input id="year" type="number" min="1" max="5" value={form.year} onChange={set('year')} />
          </div>
          <div className="field">
            <label htmlFor="section">Section</label>
            <input id="section" value={form.section} onChange={set('section')} maxLength={2} />
          </div>
          <div className="field">
            <label htmlFor="department">Department</label>
            <select id="department" value={form.department} onChange={set('department')} required>
              <option value="">Choose one</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="tutor">Class tutor</label>
            <select id="tutor" value={form.tutor} onChange={set('tutor')}>
              <option value="">Assign later</option>
              {tutors.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="periods">Periods per day</label>
            <input id="periods" type="number" min="1" max="12" value={form.periodsPerDay} onChange={set('periodsPerDay')} />
          </div>
          <div className="field">
            <label htmlFor="min">Minimum attendance %</label>
            <input id="min" type="number" min="0" max="100" value={form.minAttendance} onChange={set('minAttendance')} />
          </div>
        </div>
        <button type="submit">Create class</button>
      </form>

      <div className="sheet">
        <h3>Existing classes</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Department</th>
                <th>Periods/day</th>
                <th>Min %</th>
                <th>Tutor</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td>{c.department ? c.department.code : '–'}</td>
                  <td className="num">{c.periodsPerDay}</td>
                  <td className="num">{c.minAttendance}</td>
                  <td>
                    <select
                      value={c.tutor ? c.tutor._id : ''}
                      onChange={(e) => assignTutor(c._id, e.target.value)}
                    >
                      <option value="">Not assigned</option>
                      {tutors.map((t) => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
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
