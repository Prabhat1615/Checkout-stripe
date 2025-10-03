import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Checkout() {
  const { items } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Guard: require login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=${encodeURIComponent('/checkout')}`);
    }
  }, [authLoading, user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email.');
      return;
    }
    if (!items.length) {
      setError('Your cart is empty.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, items: items.map(({ id, quantity }) => ({ id, quantity })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout session');

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <h2 className="heading">Checkout</h2>
      {/* Compact cart summary with thumbnails */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        {items.map((it) => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #f3f3f3' }}>
            {it.image ? (
              <img src={it.image} alt={it.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, background: '#f0f0f0' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f0f0f0' }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>Qty: {it.quantity}</div>
            </div>
            <div style={{ fontWeight: 600 }}>${(it.price * it.quantity / 100).toFixed(2)}</div>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="form">
        <label>
          <div className="muted">Email</div>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Redirecting…' : 'Proceed to Checkout'}
        </button>
        {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}
      </form>
    </div>
  );
}
