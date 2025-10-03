import { useEffect, useState } from 'react';
import { useCart } from '../context/CartContext';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null); // modal product
  const { addItem } = useCart();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        // Backend already returns price in cents and correct IDs from DB
        setProducts(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <h2 className="heading">Electronics</h2>
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ width: '100%', height: 160, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: '70%', height: 16, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '30%', height: 14, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: '100%', height: 40 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (error) return <div className="container"><p style={{ color: 'crimson' }}>{error}</p></div>;

  return (
    <div className="container fade-in">
      <h2 className="heading">Electronics</h2>
      <div className="grid">
        {products.map((p) => (
          <div key={p.id} className="card">
            <div onClick={() => setActive(p)} style={{ cursor: 'pointer' }}>
              {p.image ? (
                <img src={p.image} alt={p.name} className="product-img" />
              ) : (
                <div className="product-img" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>No Image</div>
              )}
              <div className="title">{p.name}</div>
              <div className="price">${(p.price / 100).toFixed(2)}</div>
            </div>
            <button className="btn btn-primary" onClick={() => addItem(p)}>Add to Cart</button>
          </div>
        ))}
      </div>
      {active ? (
        <div className="modal-backdrop" onClick={() => setActive(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {active.image ? (
              <img src={active.image} alt={active.name} style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />
            ) : null}
            <div className="space-between" style={{ marginBottom: 12 }}>
              <div className="title" style={{ fontSize: 20 }}>{active.name}</div>
              <div className="price">${(active.price / 100).toFixed(2)}</div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setActive(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { addItem(active); setActive(null); }}>Add to Cart</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
