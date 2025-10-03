import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email.');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      await register(email, password);
      navigate(redirectTo);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container fade-in">
      <h2 className="heading">Register</h2>
      <form onSubmit={onSubmit} className="form surface" style={{ padding: 16 }}>
        <label>
          <div className="muted">Email</div>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </label>
        <label>
          <div className="muted">Password</div>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading || !email || !password}>{loading ? 'Registering…' : 'Register'}</button>
        {error ? <div style={{ color: '#ef4444' }}>{error}</div> : null}
      </form>
      <div style={{ marginTop: 12 }}>
        Already have an account? <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`}>Login</Link>
      </div>
    </div>
  );
}
