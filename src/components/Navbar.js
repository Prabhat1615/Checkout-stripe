import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';

export default function Navbar() {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);
  return (
    <nav className="nav">
      <Link to="/" className="brand">My Shop</Link>
      <div className="row" style={{ gap: '1rem' }}>
        <Link to="/">Products</Link>
        <Link to="/cart" className="row" style={{ gap: 6 }}>
          <span>Cart</span>
          <span className="pill">{count}</span>
        </Link>
        {user ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              {user.email}
            </button>
            {open ? (
              <div
                role="menu"
                className="surface"
                style={{ position: 'absolute', right: 0, top: '110%', minWidth: 180, padding: 8, zIndex: 20 }}
              >
                <Link to="/orders" onClick={() => setOpen(false)} style={{ display: 'block', padding: '8px 10px' }}>Orders</Link>
                <button className="btn btn-ghost" onClick={onLogout} style={{ width: '100%', marginTop: 6 }}>Logout</button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
