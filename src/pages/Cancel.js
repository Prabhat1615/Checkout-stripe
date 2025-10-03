import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Cancel() {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const fmt = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

  useEffect(() => {
    // Try to get session_id from URL if available
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get('session_id');
    
    if (sessionId && user) {
      // If we have a session_id and user is logged in, try to fetch order details
      async function loadOrder() {
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
      loadOrder();
    }
  }, [user]);

  return (
    <div className="container fade-in">
      <div className="surface" style={{ padding: 20, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9999, background: '#e11d48' }} />
          <h2 className="heading" style={{ margin: 0 }}>Payment Cancelled</h2>
        </div>
        <p>Your payment was cancelled or not completed. No charges were made to your account.</p>
        
        {order && (
          <>
            <div style={{ borderTop: '1px solid #1f2937', margin: '12px 0' }} />
            <div style={{ marginBottom: 12 }}>
              <div><strong>Order ID:</strong> {order.session_id}</div>
              <div><strong>Status:</strong> <span className="badge badge-failed">{order.status}</span></div>
              <div><strong>Total:</strong> {fmt(order.amount)}</div>
            </div>
            {order.items && order.items.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <strong>Items in your cart:</strong>
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
        
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Link to="/cart"><button className="btn btn-primary">Try Again</button></Link>
          <Link to="/products"><button className="btn btn-ghost">Continue Shopping</button></Link>
          <Link to="/orders"><button className="btn btn-ghost">View Orders</button></Link>
        </div>
      </div>
    </div>
  );
}
