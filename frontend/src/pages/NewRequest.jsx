import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { readError } from '../api/client';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = {
  od: [
    ['symposium', 'Symposium or conference'],
    ['internship', 'Internship'],
    ['placement', 'Placement drive or interview'],
    ['sports', 'Sports'],
    ['nss_ncc', 'NSS or NCC'],
    ['other', 'Something else'],
  ],
  leave: [
    ['medical', 'Medical'],
    ['family', 'Family'],
    ['personal', 'Personal'],
    ['other', 'Something else'],
  ],
};

const today = () => new Date().toISOString().slice(0, 10);

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const periodsPerDay = user.classSection ? user.classSection.periodsPerDay || 8 : 8;

  const [type, setType] = useState('od');
  const [category, setCategory] = useState('symposium');
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [wholeDay, setWholeDay] = useState(true);
  const [periods, setPeriods] = useState([]);
  const [reason, setReason] = useState('');
  const [venue, setVenue] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const switchType = (value) => {
    setType(value);
    setCategory(CATEGORIES[value][0][0]);
  };

  const togglePeriod = (n) =>
    setPeriods((prev) => (prev.includes(n) ? prev.filter((p) => p !== n) : [...prev, n].sort((a, b) => a - b)));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!wholeDay && periods.length === 0) {
      setError('Pick at least one period, or switch back to the whole day.');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('type', type);
      form.append('category', category);
      form.append('fromDate', fromDate);
      form.append('toDate', toDate);
      form.append('reason', reason);
      form.append('venue', venue);
      form.append('periods', wholeDay ? '' : periods.join(','));
      if (file) form.append('attachment', file);

      await api.post('/requests', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate('/my-requests');
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Apply for OD or leave</h1>
          <p>Your class tutor sees this the moment you send it.</p>
        </div>
      </div>

      {error && <div className="note error">{error}</div>}

      <form className="sheet" onSubmit={submit}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="type">What are you applying for</label>
            <select id="type" value={type} onChange={(e) => switchType(e.target.value)}>
              <option value="od">On duty — attending something official</option>
              <option value="leave">Leave — you will not attend</option>
            </select>
            <div className="hint">
              {type === 'od'
                ? 'OD periods are counted as attended once approved.'
                : 'Leave is recorded as an excused absence and does not count as attended.'}
            </div>
          </div>

          <div className="field">
            <label htmlFor="category">Reason type</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES[type].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="from">First day</label>
            <input
              id="from"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                if (toDate < e.target.value) setToDate(e.target.value);
              }}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="to">Last day</label>
            <input
              id="to"
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label>How much of the day</label>
          <div className="row">
            <label className="row" style={{ margin: 0, color: 'var(--ink)' }}>
              <input
                type="radio"
                name="span"
                checked={wholeDay}
                onChange={() => setWholeDay(true)}
              />
              Whole day
            </label>
            <label className="row" style={{ margin: 0, color: 'var(--ink)' }}>
              <input
                type="radio"
                name="span"
                checked={!wholeDay}
                onChange={() => setWholeDay(false)}
              />
              Only some periods
            </label>
          </div>
        </div>

        {!wholeDay && (
          <div className="field">
            <label>Which periods</label>
            <div className="period-picker">
              {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map((n) => (
                <label key={n} className={periods.includes(n) ? 'on' : ''}>
                  <input
                    type="checkbox"
                    checked={periods.includes(n)}
                    onChange={() => togglePeriod(n)}
                  />
                  Period {n}
                </label>
              ))}
            </div>
            <div className="hint">The same periods apply to every day in the range.</div>
          </div>
        )}

        <div className="field">
          <label htmlFor="reason">Tell your tutor what this is for</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Presenting a paper at the national symposium on machine learning."
            required
            maxLength={1000}
          />
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="venue">Where (optional)</label>
            <input
              id="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Anna University, Chennai"
            />
          </div>

          <div className="field">
            <label htmlFor="proof">Proof (optional)</label>
            <input
              id="proof"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            <div className="hint">Brochure, call letter or medical certificate. PDF or image, up to 5 MB.</div>
          </div>
        </div>

        <button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send to my tutor'}
        </button>
      </form>
    </>
  );
}
