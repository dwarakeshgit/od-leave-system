import { useEffect, useState } from 'react';
import api, { readError } from '../api/client';
import RequestEntry from '../components/RequestEntry';
import { useAuth } from '../context/AuthContext';

export default function Approvals() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [comments, setComments] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/requests/pending')
      .then((res) => setRequests(res.data))
      .catch((err) => setError(readError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const act = async (request, decision) => {
    setBusyId(request._id);
    setError('');
    setMessage('');
    try {
      const { data } = await api.put(`/requests/${request._id}/decision`, {
        decision,
        comment: comments[request._id] || '',
      });
      if (decision === 'rejected') {
        setMessage(`${request.ticket} rejected. The student has been told why.`);
      } else if (data.sync) {
        setMessage(
          `${request.ticket} approved. Attendance updated for ${data.sync.daysUpdated} day(s).`
        );
      } else {
        setMessage(`${request.ticket} approved and sent to the HOD.`);
      }
      load();
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Approvals</h1>
          <p>
            {user.role === 'tutor'
              ? 'Requests from your class, oldest first.'
              : 'Requests your tutors have already verified.'}
          </p>
        </div>
      </div>

      {error && <div className="note error">{error}</div>}
      {message && <div className="note good">{message}</div>}

      <div className="sheet">
        {loading ? (
          <p>Loading…</p>
        ) : requests.length === 0 ? (
          <div className="empty">
            <h3>Queue is clear</h3>
            <p>Nothing is waiting on you right now. New requests show up here as students apply.</p>
          </div>
        ) : (
          requests.map((r) => (
            <RequestEntry key={r._id} request={r} showStudent>
              <input
                placeholder="Add a note for the student (optional)"
                value={comments[r._id] || ''}
                onChange={(e) => setComments({ ...comments, [r._id]: e.target.value })}
                style={{ maxWidth: 420 }}
              />
              <button
                className="approve small"
                disabled={busyId === r._id}
                onClick={() => act(r, 'approved')}
              >
                {user.role === 'tutor' ? 'Verify and send to HOD' : 'Approve'}
              </button>
              <button
                className="reject small"
                disabled={busyId === r._id}
                onClick={() => act(r, 'rejected')}
              >
                Reject
              </button>
            </RequestEntry>
          ))
        )}
      </div>
    </>
  );
}
