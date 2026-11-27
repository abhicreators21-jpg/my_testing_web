import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const GUEST_KEY = 'shopsphere_guest_cart';
const SHIPPING_FEE = 499;
const FREE_SHIPPING = 5000;

const CartContext = createContext(null);

function readGuest() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuest(items) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(items));
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

export function buildCartFromItems(items) {
  const list = items.map((item) => ({
    ...item,
    lineTotalCents: item.priceCents * item.quantity,
  }));
  const subtotalCents = list.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const shippingCents = list.length === 0 || subtotalCents >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  return {
    items: list,
    count: list.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    freeShippingThresholdCents: FREE_SHIPPING,
  };
}

const EMPTY_CART = buildCartFromItems([]);

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState([]);

  // Sync: guest cart from localStorage, signed-in cart from SQLite.
  useEffect(() => {
    if (authLoading) return undefined;
    let cancelled = false;

    async function sync() {
      if (!user) {
        if (!cancelled) {
          setCart(buildCartFromItems(readGuest()));
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const guestItems = readGuest();
      try {
        const data = guestItems.length
          ? await api.post('/cart/merge', { items: guestItems })
          : await api.get('/cart');
        if (cancelled) return;
        writeGuest([]);
        setCart(data.cart);
      } catch {
        if (!cancelled) setCart(EMPTY_CART);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const markPending = useCallback((productId, isPending) => {
    setPendingIds((current) =>
      isPending ? [...new Set([...current, productId])] : current.filter((id) => id !== productId),
    );
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(buildCartFromItems(readGuest()));
      return;
    }
    const data = await api.get('/cart');
    setCart(data.cart);
  }, [user]);

  const addItem = useCallback(
    async (product, quantity = 1) => {
      if (!product?.id) throw new Error('Invalid product');
      markPending(product.id, true);
      try {
        if (user) {
          const data = await api.post('/cart', { productId: product.id, quantity });
          setCart(data.cart);
          return data.cart;
        }
        const items = readGuest();
        const existing = items.find((item) => item.productId === product.id);
        const stock = Number.isFinite(product.stock) ? product.stock : 99;
        if (existing) {
          existing.quantity = Math.min(existing.quantity + quantity, Math.max(stock, 1));
        } else {
          items.push({
            productId: product.id,
            name: product.name,
            priceCents: product.priceCents,
            imageUrl: product.imageUrl,
            stock,
            quantity: Math.min(quantity, Math.max(stock, 1)),
          });
        }
        writeGuest(items);
        const next = buildCartFromItems(items);
        setCart(next);
        return next;
      } finally {
        markPending(product.id, false);
      }
    },
    [user, markPending],
  );

  const setQuantity = useCallback(
    async (productId, quantity) => {
      markPending(productId, true);
      try {
        if (user) {
          if (quantity < 1) {
            const data = await api.del(`/cart/${productId}`);
            setCart(data.cart);
            return data.cart;
          }
          const data = await api.patch(`/cart/${productId}`, { quantity });
          setCart(data.cart);
          return data.cart;
        }
        const items = readGuest();
        const target = items.find((item) => item.productId === productId);
        if (target) {
          if (quantity < 1) items.splice(items.indexOf(target), 1);
          else target.quantity = Math.min(quantity, Math.max(target.stock || 99, 1));
        }
        writeGuest(items);
        const next = buildCartFromItems(items);
        setCart(next);
        return next;
      } finally {
        markPending(productId, false);
      }
    },
    [user, markPending],
  );

  const removeItem = useCallback((productId) => setQuantity(productId, 0), [setQuantity]);

  const clearCart = useCallback(async () => {
    if (user) {
      const data = await api.del('/cart');
      setCart(data.cart);
      return data.cart;
    }
    writeGuest([]);
    const next = buildCartFromItems([]);
    setCart(next);
    return next;
  }, [user]);

  const value = useMemo(
    () => ({
      cart,
      loading,
      pendingIds,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      refresh,
      isGuest: !user,
    }),
    [cart, loading, pendingIds, addItem, setQuantity, removeItem, clearCart, refresh, user],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
