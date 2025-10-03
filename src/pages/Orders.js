import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Orders() {
  const { loading: authLoading, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState(null);
  const location = useLocation();

  const fmt = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;
  const badgeClass = (status) =>
    status === 'succeeded' ? 'badge badge-success' : status === 'pending' ? 'badge badge-pending' : 'badge badge-failed';

  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false);
        setError('You must be logged in to view orders.');
        return;
      }
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/orders', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load orders');
        setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) load();
  }, [authLoading, user]);

  // Read status from URL to show a one-time banner after returning from Stripe
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status === 'success') {
      setBanner({ type: 'success', text: 'Thank you! Your payment was successful.' });
    } else if (status === 'failed') {
      setBanner({ type: 'error', text: 'Payment failed or was canceled.' });
    } else {
      setBanner(null);
    }
  }, [location.search]);

  if (authLoading) return <div className="container">Loading…</div>;
  if (!user) return <div className="container">Please log in to view your orders.</div>;
  if (loading) return <div className="container">Loading orders…</div>;
  if (error) return <div className="container" style={{ color: 'crimson' }}>{error}</div>;

  return (
    <div className="container">
      <h2 className="heading">Your Orders</h2>
      {banner ? (
        <div className="surface" style={{ padding: 12, marginBottom: 12, borderColor: banner.type === 'success' ? '#14532d' : '#7f1d1d' }}>
          <div style={{ color: banner.type === 'success' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
            {banner.text}
          </div>
        </div>
      ) : null}
      {orders.length === 0 ? (
        <div className="muted">No orders yet.</div>
      ) : (
        <div className="surface" style={{ padding: 8 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.session_id}>
                  <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>{o.session_id}</td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td style={{ maxWidth: 360 }}>
                    {Array.isArray(o.items) && o.items.length ? (
                      <span className="muted">
                        {o.items
                          .map((it) => `${(it.name || it.description || 'Item')}${it.quantity ? ` (x${it.quantity})` : ''}`)
                          .join(', ')}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{fmt(o.amount)}</td>
                  <td><span className={badgeClass(o.status)}>{o.status === 'succeeded' ? 'Paid' : o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
