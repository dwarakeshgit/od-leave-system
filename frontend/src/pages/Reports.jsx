import { useEffect, useState } from 'react';
import api, { readError } from '../api/client';

export default function Reports() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get('/admin/classes')
      .then((res) => {
        setClasses(res.data);
        if (res.data.length) setClassId(res.data[0]._id);
      })
      .catch((err) => setError(readError(err)));
  }, []);

  const load = () => {
    if (!classId) return;
    setLoading(true);
    api
      .get('/attendance/report', { params: { classSection: classId, from, to } })
      .then((res) => setReport(res.data))
      .catch((err) => setError(readError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [classId, from, to]);

  const exportCsv = async () => {
    try {
      const res = await api.get('/attendance/report.csv', {
        params: { classSection: classId, from, to },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(readError(err));
    }
  };

  const threshold = report && report.classSection ? report.classSection.minAttendance : 75;
  const shortfall = report ? report.rows.filter((r) => r.percentageWithOd < threshold).length : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Attendance report</h1>
          <p>Percentages include approved OD as attended, and show the strict figure alongside.</p>
        </div>
        <button className="ghost" onClick={exportCsv} disabled={!report}>
          Download CSV
        </button>
      </div>

      {error && <div className="note error">{error}</div>}

      <div className="sheet">
        <div className="grid-3">
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
            <label htmlFor="from">From</label>
            <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="to">To</label>
            <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <p>Building the report…</p>
      ) : report && report.rows.length > 0 ? (
        <div className="sheet">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{report.rows.length} students</h3>
            <div className="entry-meta">
              {shortfall === 0
                ? `Everyone is at or above ${threshold}%.`
                : `${shortfall} student(s) are below ${threshold}%.`}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Roll no</th>
                  <th>Name</th>
                  <th>Periods</th>
                  <th>Present</th>
                  <th>OD</th>
                  <th>Leave</th>
                  <th>Absent</th>
                  <th>With OD</th>
                  <th>Strict</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => {
                  const low = row.percentageWithOd < threshold;
                  return (
                    <tr key={row.student._id}>
                      <td className="num">{row.student.rollNo}</td>
                      <td>{row.student.name}</td>
                      <td className="num">{row.totalPeriods}</td>
                      <td className="num">{row.present}</td>
                      <td className="num">{row.od}</td>
                      <td className="num">{row.leave}</td>
                      <td className="num">{row.absent}</td>
                      <td>
                        <span className={`stamp ${low ? 'rejected' : 'approved'}`}>
                          {row.percentageWithOd}%
                        </span>
                      </td>
                      <td className="num">{row.percentageStrict}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="sheet">
          <div className="empty">
            <h3>No attendance in this range</h3>
            <p>Pick a wider date range, or mark a few periods first.</p>
          </div>
        </div>
      )}
    </>
  );
}
