import { useEffect, useState } from 'react';
import api, { readError } from '../api/client';
import AttendanceRuler from '../components/AttendanceRuler';

const dateText = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

const CELL = {
  present: { text: 'P', className: 'quiet' },
  absent: { text: 'A', className: 'rejected' },
  od: { text: 'OD', className: 'approved' },
  leave: { text: 'L', className: 'pending' },
};

export default function MyAttendance() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/attendance/me')
      .then((res) => setData(res.data))
      .catch((err) => setError(readError(err)));
  }, []);

  if (error) return <div className="note error">{error}</div>;
  if (!data) return <p>Loading…</p>;

  const maxPeriods = data.days.reduce(
    (max, day) => Math.max(max, ...day.periods.map((p) => p.period), 0),
    0
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My attendance</h1>
          <p>Day by day, exactly as it stands in the register.</p>
        </div>
      </div>

      <div className="sheet">
        <AttendanceRuler summary={data.summary} minAttendance={data.minAttendance} />
      </div>

      <div className="sheet">
        <h3>Daily register</h3>
        {data.days.length === 0 ? (
          <div className="empty">
            <h3>Nothing recorded yet</h3>
            <p>Attendance appears here once your faculty start marking periods.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {Array.from({ length: maxPeriods }, (_, i) => i + 1).map((n) => (
                    <th key={n}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.days.map((day) => (
                  <tr key={day.date}>
                    <td style={{ whiteSpace: 'nowrap' }}>{dateText(day.date)}</td>
                    {Array.from({ length: maxPeriods }, (_, i) => i + 1).map((n) => {
                      const slot = day.periods.find((p) => p.period === n);
                      if (!slot) return <td key={n} style={{ color: 'var(--ink-faint)' }}>–</td>;
                      const cell = CELL[slot.status];
                      return (
                        <td key={n}>
                          <span className={`stamp ${cell.className}`}>{cell.text}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="entry-meta" style={{ marginTop: 12 }}>
          P present · A absent · OD on duty, counted as attended · L approved leave
        </div>
      </div>
    </>
  );
}
