import { useEffect, useState } from 'react';
import api, { readError } from '../api/client';

const today = () => new Date().toISOString().slice(0, 10);

const STATUS_WORD = {
  present: 'Present',
  absent: 'Absent',
  od: 'On duty (approved)',
  leave: 'Leave (approved)',
};

export default function MarkAttendance() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState(1);
  const [subject, setSubject] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/admin/classes')
      .then((res) => {
        setClasses(res.data);
        if (res.data.length) setClassId(res.data[0]._id);
      })
      .catch((err) => setError(readError(err)));
  }, []);

  const loadRoster = () => {
    if (!classId) return;
    setLoading(true);
    setMessage('');
    api
      .get('/attendance/roster', { params: { classSection: classId, date, period } })
      .then((res) => setRows(res.data.rows))
      .catch((err) => setError(readError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(loadRoster, [classId, date, period]);

  const setStatus = (studentId, status) =>
    setRows((prev) =>
      prev.map((row) => (row.student._id === studentId ? { ...row, status } : row))
    );

  const markAll = (status) =>
    setRows((prev) => prev.map((row) => (row.locked ? row : { ...row, status })));

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const entries = rows
        .filter((row) => !row.locked)
        .map((row) => ({ student: row.student._id, status: row.status }));
      const { data } = await api.post('/attendance/mark', {
        classSection: classId,
        date,
        period,
        subject,
        entries,
      });
      setMessage(
        data.skippedAutoEntries
          ? `${data.message}. ${data.skippedAutoEntries} student(s) already have an approved OD or leave and were left as they are.`
          : data.message
      );
      loadRoster();
    } catch (err) {
      setError(readError(err));
    } finally {
      setSaving(false);
    }
  };

  const section = classes.find((c) => c._id === classId);
  const periodsPerDay = section ? section.periodsPerDay || 8 : 8;
  const lockedCount = rows.filter((r) => r.locked).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Mark attendance</h1>
          <p>Approved OD and leave are already filled in and cannot be overwritten.</p>
        </div>
      </div>

      {error && <div className="note error">{error}</div>}
      {message && <div className="note good">{message}</div>}

      <div className="sheet">
        <div className="grid-4">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="class">Class</label>
            <select id="class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="period">Period</label>
            <select id="period" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
              {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Period {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="subject">Subject (optional)</label>
            <input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Compiler Design"
            />
          </div>
        </div>
      </div>

      <div className="sheet">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="row">
            <button className="ghost small" onClick={() => markAll('present')}>
              Mark everyone present
            </button>
            <button className="ghost small" onClick={() => markAll('absent')}>
              Mark everyone absent
            </button>
          </div>
          {lockedCount > 0 && (
            <div className="entry-meta">
              {lockedCount} student(s) locked by an approved request
            </div>
          )}
        </div>

        {loading ? (
          <p>Loading the class list…</p>
        ) : rows.length === 0 ? (
          <div className="empty">
            <h3>No students in this class yet</h3>
            <p>The office can add students to a class from the people page.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Roll no</th>
                  <th>Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.student._id}>
                    <td className="num">{row.student.rollNo}</td>
                    <td>{row.student.name}</td>
                    <td>
                      {row.locked ? (
                        <span className={`stamp ${row.status === 'od' ? 'approved' : 'quiet'}`}>
                          {STATUS_WORD[row.status]}
                        </span>
                      ) : (
                        <div className="row">
                          <label className="row" style={{ margin: 0, color: 'var(--ink)' }}>
                            <input
                              type="radio"
                              name={`s-${row.student._id}`}
                              checked={row.status === 'present'}
                              onChange={() => setStatus(row.student._id, 'present')}
                            />
                            Present
                          </label>
                          <label className="row" style={{ margin: 0, color: 'var(--ink)' }}>
                            <input
                              type="radio"
                              name={`s-${row.student._id}`}
                              checked={row.status === 'absent'}
                              onChange={() => setStatus(row.student._id, 'absent')}
                            />
                            Absent
                          </label>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <button onClick={save} disabled={saving} style={{ marginTop: 16 }}>
            {saving ? 'Saving…' : 'Save attendance'}
          </button>
        )}
      </div>
    </>
  );
}
