import { useEffect, useState } from 'react';
import api, { readError } from '../api/client';

const when = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/notifications').then((res) => setItems(res.data)).catch((e) => setError(readError(e)));
  };

  useEffect(load, []);

  const markRead = async () => {
    await api.put('/notifications/read');
    load();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Updates</h1>
          <p>Every step of your requests, in the order it happened.</p>
        </div>
        {items.some((i) => !i.read) && (
          <button className="ghost" onClick={markRead}>
            Mark all as read
          </button>
        )}
      </div>

      {error && <div className="note error">{error}</div>}

      <div className="sheet">
        {items.length === 0 ? (
          <div className="empty">
            <h3>No updates yet</h3>
            <p>You will hear here the moment a tutor or HOD acts on a request.</p>
          </div>
        ) : (
          items.map((item) => (
            <div className="entry" key={item._id}>
              <div className="entry-top">
                <div>
                  <div className="entry-title">{item.title}</div>
                  {item.body && <div className="entry-meta">{item.body}</div>}
                </div>
                <div className="entry-meta">{when(item.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
