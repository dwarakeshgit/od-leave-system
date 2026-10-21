import { useEffect, useState } from 'react';
import api, { readError } from '../api/client';
import RequestEntry from '../components/RequestEntry';
import { useAuth } from '../context/AuthContext';

export default function AllRequests() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ status: '', type: '', q: '', from: '', to: '' });
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api
      .get('/requests', { params })
      .then((res) => setRequests(res.data))
      .catch((err) => setError(readError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filters]);

  const set = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });

  const revert = async (id) => {
    try {
      await api.put(`/requests/${id}/cancel`);
      load();
    } catch (err) {
      setError(readError(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>All requests</h1>
          <p>The full record, searchable by student name, roll number or ticket.</p>
        </div>
      </div>

      {error && <div className="note error">{error}</div>}

      <div className="sheet">
        <div className="grid-4">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="q">Search</label>
            <input id="q" value={filters.q} onChange={set('q')} placeholder="Name, roll or ticket" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="status">Status</label>
            <select id="status" value={filters.status} onChange={set('status')}>
              <option value="">Any</option>
              <option value="pending">Waiting</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Withdrawn</option>
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="from">From</label>
            <input id="from" type="date" value={filters.from} onChange={set('from')} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="to">To</label>
            <input id="to" type="date" value={filters.to} onChange={set('to')} />
          </div>
        </div>
      </div>

      <div className="sheet">
        {loading ? (
          <p>Loading…</p>
        ) : requests.length === 0 ? (
          <div className="empty">
            <h3>No requests match</h3>
            <p>Widen the dates or clear the search box.</p>
          </div>
        ) : (
          requests.map((r) => (
            <RequestEntry key={r._id} request={r} showStudent>
              {user.role === 'admin' && r.status === 'approved' && (
                <button className="ghost small" onClick={() => revert(r._id)}>
                  Revert and undo attendance
                </button>
              )}
            </RequestEntry>
          ))
        )}
      </div>
    </>
  );
}
