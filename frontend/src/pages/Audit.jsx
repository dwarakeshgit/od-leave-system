import { useEffect, useState } from 'react';
import api, { readError } from '../api/client';

const when = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const WORDING = {
  'request.created': 'submitted a request',
  'request.approved': 'approved a request',
  'request.rejected': 'rejected a request',
  'request.cancelled': 'withdrew a request',
  'user.created': 'created an account',
};

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/audit').then((res) => setLogs(res.data)).catch((e) => setError(readError(e)));
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Activity log</h1>
          <p>Who did what, and when. This is the record that replaces chat screenshots.</p>
        </div>
      </div>

      {error && <div className="note error">{error}</div>}

      <div className="sheet">
        {logs.length === 0 ? (
          <div className="empty">
            <h3>Nothing recorded yet</h3>
            <p>Approvals and account changes appear here as they happen.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>What</th>
                  <th>Ticket</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{when(log.createdAt)}</td>
                    <td>{log.actor ? log.actor.name : 'System'}</td>
                    <td>{WORDING[log.action] || log.action}</td>
                    <td className="num">{log.request ? log.request.ticket : '–'}</td>
                    <td>{log.details}</td>
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
