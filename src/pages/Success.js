import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Success() {
  const [status, setStatus] = useState('loading');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const fmt = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get('session_id');
    async function load() {
      try {
        if (!sessionId) throw new Error('Missing session_id');
        
        // Get session status
        const res = await fetch(`/api/session-status?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load session');
        setStatus(data.status);
        setPaymentStatus(data.payment_status);
        
        // If user is logged in, try to fetch order details
        if (user) {
          try {
            const token = localStorage.getItem('auth_token');
            const orderRes = await fetch(`/api/orders`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (orderRes.ok) {
              const orders = await orderRes.json();
              const matchingOrder = orders.find(o => o.session_id === sessionId);
              if (matchingOrder) {
                setOrder(matchingOrder);
              }
            }
          } catch (e) {
            console.warn('Failed to load order details:', e.message);
          }
        }
      } catch (e) {
        setError(e.message);
      }
    }
    load();
  }, [user]);

  if (error) return (
    <div className="container fade-in">
      <div className="surface" style={{ padding: 20 }}>
        <h2 className="heading">Payment Status</h2>
        <p style={{ color: 'crimson' }}>{error}</p>
        <Link to="/orders"><button className="btn btn-ghost" style={{ marginTop: 8 }}>View Orders</button></Link>
      </div>
    </div>
  );
  
  if (status === 'loading') return <div className="container"><p>Checking your payment status…</p></div>;

  const isSuccess = paymentStatus === 'paid' || status === 'complete';
  const badgeClass = isSuccess ? 'badge badge-success' : 'badge badge-failed';
  const statusText = isSuccess ? 'Payment Successful!' : 'Payment Failed';

  return (
    <div className="container fade-in">
      <div className="surface" style={{ padding: 20, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9999, background: isSuccess ? '#16a34a' : '#e11d48' }} />
          <h2 className="heading" style={{ margin: 0 }}>{statusText}</h2>
        </div>
        
        {isSuccess ? (
          <>
            <p className="muted">Thank you for your purchase. Your order is being processed.</p>
            {order && (
              <>
                <div style={{ borderTop: '1px solid #1f2937', margin: '12px 0' }} />
                <div className="row space-between" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div><strong>Order ID:</strong> {order.session_id}</div>
                    <div><strong>Order Status:</strong> <span className={badgeClass}>{order.status === 'succeeded' ? 'Paid' : order.status}</span></div>
                    <div><strong>Total:</strong> {fmt(order.amount)}</div>
                  </div>
                </div>
                {order.items && order.items.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <strong>Items:</strong>
                    <div style={{ marginTop: 8, padding: 8, backgroundColor: '#1f2937', borderRadius: 8 }}>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                          <span>{item.name || item.description} {item.quantity > 1 ? `(x${item.quantity})` : ''}</span>
                          <span>{fmt(item.amount_total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <p>Your payment was not completed or failed. Please try again or contact support if you were charged.</p>
            {order && (
              <>
                <div style={{ borderTop: '1px solid #1f2937', margin: '12px 0' }} />
                <div className="row space-between" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div><strong>Order ID:</strong> {order.session_id}</div>
                    <div><strong>Order Status:</strong> <span className={badgeClass}>{order.status}</span></div>
                    <div><strong>Total:</strong> {fmt(order.amount)}</div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
        
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Link to="/orders"><button className="btn btn-primary">View Orders</button></Link>
          <Link to="/products"><button className="btn btn-ghost">Continue Shopping</button></Link>
        </div>
      </div>
    </div>
  );
}
