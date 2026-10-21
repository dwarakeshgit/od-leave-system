import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { readError } from '../api/client';
import RequestEntry from '../components/RequestEntry';

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/requests', { params: filter ? { status: filter } : {} })
      .then((res) => setRequests(res.data))
      .catch((err) => setError(readError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const withdraw = async (id) => {
    setError('');
    setMessage('');
    try {
      await api.put(`/requests/${id}/cancel`);
      setMessage('Request withdrawn.');
      load();
    } catch (err) {
      setError(readError(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My requests</h1>
          <p>Every OD and leave you have applied for, with who has it right now.</p>
        </div>
        <Link className="button" to="/new-request">
          New request
        </Link>
      </div>

      {error && <div className="note error">{error}</div>}
      {message && <div className="note good">{message}</div>}

      <div className="row" style={{ marginBottom: 16 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">All requests</option>
          <option value="pending">Waiting</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Withdrawn</option>
        </select>
      </div>

      <div className="sheet">
        {loading ? (
          <p>Loading…</p>
        ) : requests.length === 0 ? (
          <div className="empty">
            <h3>Nothing here yet</h3>
            <p>Apply for an OD or leave and it will appear in this list with its approval trail.</p>
            <Link className="button" to="/new-request">
              Apply now
            </Link>
          </div>
        ) : (
          requests.map((r) => (
            <RequestEntry key={r._id} request={r}>
              {r.status === 'pending' && (
                <button className="ghost small" onClick={() => withdraw(r._id)}>
                  Withdraw
                </button>
              )}
            </RequestEntry>
          ))
        )}
      </div>
    </>
  );
}
