import Stamp from './Stamp';

const dateText = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const CATEGORY_LABEL = {
  nss_ncc: 'NSS / NCC',
};

const label = (c) => CATEGORY_LABEL[c] || c.charAt(0).toUpperCase() + c.slice(1);

export default function RequestEntry({ request, showStudent = false, children }) {
  const r = request;
  const span =
    r.fromDate === r.toDate || dateText(r.fromDate) === dateText(r.toDate)
      ? dateText(r.fromDate)
      : `${dateText(r.fromDate)} to ${dateText(r.toDate)}`;

  return (
    <div className="entry">
      <div className="entry-top">
        <div>
          <div className="entry-title">
            {showStudent && r.student ? `${r.student.name} · ` : ''}
            {r.type === 'od' ? 'On duty' : 'Leave'} · {label(r.category)}
          </div>
          <div className="entry-meta">
            {r.ticket}
            {showStudent && r.student && r.student.rollNo ? ` · ${r.student.rollNo}` : ''} · {span} ·{' '}
            {r.periods && r.periods.length
              ? `periods ${r.periods.join(', ')}`
              : `${r.totalDays} full day${r.totalDays > 1 ? 's' : ''}`}
          </div>
        </div>
        <Stamp status={r.status} stage={r.currentStage} />
      </div>

      <p style={{ marginTop: 10, marginBottom: 0 }}>{r.reason}</p>
      {r.venue && <div className="entry-meta">Venue: {r.venue}</div>}
      {r.attachment && (
        <div className="entry-meta">
          <a href={r.attachment} target="_blank" rel="noreferrer">
            Open the attached proof
          </a>
        </div>
      )}

      <div className="trail">
        {r.approvals.map((step) => (
          <div key={step.stage}>
            <strong style={{ color: 'var(--ink)' }}>
              {step.stage === 'tutor' ? 'Class tutor' : 'HOD'}
            </strong>
            {': '}
            {step.status === 'pending'
              ? r.status === 'pending' && r.currentStage === step.stage
                ? 'reviewing now'
                : 'not reached'
              : `${step.status}${step.approver ? ` by ${step.approver.name}` : ''}`}
            {step.comment ? ` — ${step.comment}` : ''}
          </div>
        ))}
        {r.status === 'approved' && r.attendanceSynced && (
          <div style={{ color: 'var(--stamp-approved)' }}>
            Attendance register updated automatically.
          </div>
        )}
      </div>

      {children && <div className="row" style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}
