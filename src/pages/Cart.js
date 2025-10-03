import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { items, updateQty, removeItem, total, clear } = useCart();

  if (!items.length) {
    return (
      <div className="container fade-in">
        <h2 className="heading">Your Cart</h2>
        <div className="surface" style={{ padding: 16 }}>
          <p className="muted">Your cart is empty.</p>
          <div style={{ marginTop: 12 }}>
            <Link to="/"><button className="btn btn-ghost">Go back to products</button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-in">
      <h2 className="heading">Your Cart</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((it) => (
          <div key={it.id} className="surface" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
            {it.image ? (
              <img
                src={it.image}
                alt={it.name}
                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, background: '#f0f0f0' }}
              />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f0f0f0' }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{it.name}</div>
              <div className="muted">${(it.price / 100).toFixed(2)} each</div>
            </div>
            <div>
              <input
                type="number"
                value={it.quantity}
                min={1}
                onChange={(e) => updateQty(it.id, parseInt(e.target.value || '1', 10))}
                style={{ width: 60 }}
              />
            </div>
            <div style={{ width: 100, textAlign: 'right' }}>
              ${(it.price * it.quantity / 100).toFixed(2)}
            </div>
            <button className="btn btn-ghost" onClick={() => removeItem(it.id)} style={{ marginLeft: 8 }}>Remove</button>
          </div>
        ))}
      </div>
      <div className="space-between" style={{ marginTop: 16 }}>
        <div className="row" style={{ gap: 8 }}>
          <Link to="/"><button className="btn btn-ghost">Continue Shopping</button></Link>
          <button className="btn btn-ghost" onClick={clear}>Clear Cart</button>
        </div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Total: ${(total / 100).toFixed(2)}</div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Link to="/checkout"><button className="btn btn-primary">Proceed to Checkout</button></Link>
      </div>
    </div>
  );
}
