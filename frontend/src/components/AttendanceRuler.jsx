/**
 * The attendance figure drawn as a ruled scale with the pass mark
 * standing on it, so a student sees at a glance how much room is left.
 */
export default function AttendanceRuler({ summary, minAttendance = 75 }) {
  const value = summary ? summary.percentageWithOd : 0;
  const safe = value >= minAttendance;
  const [whole, decimals] = value.toFixed(2).split('.');

  return (
    <div className="ruler">
      <div className="ruler-figure">
        {whole}.{decimals}
        <sup>%</sup>
      </div>
      <div className="ruler-caption">
        {safe
          ? `You are ${(value - minAttendance).toFixed(1)} points above the ${minAttendance}% pass mark.`
          : `You are ${(minAttendance - value).toFixed(1)} points below the ${minAttendance}% pass mark.`}
      </div>

      <div className="ruler-track">
        <div
          className={`ruler-fill${safe ? '' : ' short'}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
        <div className="ruler-mark" style={{ left: `${minAttendance}%` }} data-label={`${minAttendance}%`} />
      </div>

      <div className="ruler-legend">
        <span>
          <b>{summary ? summary.present : 0}</b>periods present
        </span>
        <span>
          <b>{summary ? summary.od : 0}</b>counted as on duty
        </span>
        <span>
          <b>{summary ? summary.leave : 0}</b>approved leave
        </span>
        <span>
          <b>{summary ? summary.absent : 0}</b>absent
        </span>
        <span>
          <b>{summary ? summary.percentageStrict : 0}%</b>without OD credit
        </span>
      </div>
    </div>
  );
}
