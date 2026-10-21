import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { readError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AttendanceRuler from '../components/AttendanceRuler';
import Stamp from '../components/Stamp';

const dateText = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function Counter({ value, label }) {
  return (
    <div className="counter">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(readError(err)));
  }, []);

  if (error) return <div className="note error">{error}</div>;
  if (!data) return <p>Loading…</p>;

  if (user.role === 'student') {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Good to see you, {user.name.split(' ')[0]}</h1>
            <p>
              {user.classSection ? user.classSection.name : 'Class not assigned'}
              {user.rollNo ? ` · ${user.rollNo}` : ''}
            </p>
          </div>
          <Link className="button" to="/new-request">
            Apply for OD or leave
          </Link>
        </div>

        <div className="sheet">
          <h3>Attendance so far</h3>
          <AttendanceRuler summary={data.attendance} minAttendance={data.minAttendance} />
        </div>

        <div className="grid-3">
          <Counter value={data.counts.pending} label="Waiting for approval" />
          <Counter value={data.counts.approved} label="Approved this year" />
          <Counter value={data.counts.rejected} label="Rejected" />
        </div>

        <div className="sheet" style={{ marginTop: 20 }}>
          <h3>Your last few requests</h3>
          {data.recent.length === 0 ? (
            <div className="empty">
              <h3>No requests yet</h3>
              <p>
                When you have a symposium, an interview or a medical leave, apply here and your
                tutor sees it immediately.
              </p>
              <Link className="button" to="/new-request">
                Apply for OD or leave
              </Link>
            </div>
          ) : (
            <div>
              {data.recent.map((r) => (
                <div className="entry" key={r._id}>
                  <div className="entry-top">
                    <div>
                      <div className="entry-title">
                        {r.type === 'od' ? 'On duty' : 'Leave'} · {r.ticket}
                      </div>
                      <div className="entry-meta">
                        {dateText(r.fromDate)} to {dateText(r.toDate)} · {r.totalDays} day(s)
                      </div>
                    </div>
                    <Stamp status={r.status} stage={r.currentStage} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  if (user.role === 'tutor') {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Tutor desk</h1>
            <p>{data.classes.map((c) => c.name).join(', ') || 'No class assigned yet'}</p>
          </div>
          <Link className="button" to="/approvals">
            Open approvals
          </Link>
        </div>

        <div className="grid-4">
          <Counter value={data.counts.awaiting} label="Waiting on you" />
          <Counter value={data.counts.onDutyToday} label="On OD or leave today" />
          <Counter value={data.counts.todayCount} label="Applied today" />
          <Counter value={data.counts.studentCount} label="Students in your class" />
        </div>

        <div className="sheet" style={{ marginTop: 20 }}>
          <h3>Next steps</h3>
          <p>
            Clear the approvals queue first — each one you approve moves straight to the HOD. Then
            mark today&apos;s attendance; students with an approved OD are already filled in and
            locked, so you cannot mark them absent by mistake.
          </p>
          <div className="row">
            <Link className="button" to="/attendance">
              Mark attendance
            </Link>
            <Link className="button ghost" to="/reports">
              View attendance report
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (user.role === 'hod') {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Department desk</h1>
            <p>{user.department ? user.department.name : ''}</p>
          </div>
          <Link className="button" to="/approvals">
            Open approvals
          </Link>
        </div>

        <div className="grid-3">
          <Counter value={data.counts.awaiting} label="Waiting on you" />
          <Counter value={data.counts.withTutors} label="Still with tutors" />
          <Counter value={data.counts.approvedThisMonth} label="Approved this month" />
        </div>

        <div className="sheet" style={{ marginTop: 20 }}>
          <h3>What students are asking for</h3>
          {data.byCategory.length === 0 ? (
            <p>No requests recorded yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Reason</th>
                    <th>Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((row) => (
                    <tr key={row._id}>
                      <td style={{ textTransform: 'capitalize' }}>{row._id.replace('_', ' / ')}</td>
                      <td className="num">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Office overview</h1>
          <p>Accounts, classes and the full request history.</p>
        </div>
        <Link className="button" to="/people">
          Manage people
        </Link>
      </div>

      <div className="grid-4">
        <Counter value={data.counts.students} label="Active students" />
        <Counter value={data.counts.staff} label="Tutors and HODs" />
        <Counter value={data.counts.pending} label="Requests in progress" />
        <Counter value={data.counts.approved} label="Approved all time" />
      </div>
    </>
  );
}
