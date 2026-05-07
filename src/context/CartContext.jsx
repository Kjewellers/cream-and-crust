import { createContext, useContext, useState, useEffect } from 'react';
import storage from '../utils/storage';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => storage.getCart());
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    storage.setCart(cart);
  }, [cart]);

  const addToCart = (product, selectedSize, qty = 1) => {
    setCart(prev => {
      const key = `${product.id}-${selectedSize.label}`;
      const existing = prev.find(item => item.key === key);
      if (existing) {
        return prev.map(item =>
          item.key === key ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...prev, {
        key,
        productId: product.id,
        name: product.name,
        size: selectedSize.label,
        price: selectedSize.price,
        qty,
        image: product.image,
      }];
    });
  };

  const removeFromCart = (key) => {
    setCart(prev => prev.filter(item => item.key !== key));
  };

  const updateQty = (key, qty) => {
    if (qty <= 0) {
      removeFromCart(key);
      return;
    }
    setCart(prev =>
      prev.map(item => (item.key === key ? { ...item, qty } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    storage.clearCart();
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <CartContext.Provider value={{
      cart, addToCart, removeFromCart, updateQty, clearCart,
      cartTotal, cartCount, isCartOpen, setIsCartOpen,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
