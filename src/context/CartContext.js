import React, { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // [{id, name, price, quantity}]

  const addItem = (product) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) => (p.id === product.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (id) => setItems((prev) => prev.filter((p) => p.id !== id));

  const updateQty = (id, qty) =>
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(1, qty) } : p)));

  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((s, it) => s + (it.quantity || 1), 0), [items]);
  const total = useMemo(() => items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0), [items]);

  const value = { items, addItem, removeItem, updateQty, clear, count, total };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
