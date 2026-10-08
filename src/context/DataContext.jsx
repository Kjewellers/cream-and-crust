import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToOrders,
  subscribeToCustomers,
  subscribeToInventory,
  subscribeToExpenses,
  subscribeToProducts,
  subscribeToShoppingList
} from '../services/db';
import { subscribeToAnalyticsSummary } from '../services/menuAnalytics';
import { ListenerRegistry } from '../core/listeners/ListenerRegistry';

export const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser, userRole, isAdmin, loading: authLoading, business } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // A global loading state that tracks if the initial data fetch is complete
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // IMMEDIATELY CLEAR PREVIOUS USER STATE TO PREVENT DATA LEAKAGE / FLICKERING
    setOrders([]);
    setCustomers([]);
    setInventory([]);
    setExpenses([]);
    setShoppingItems([]);
    setProducts([]);
    setAnalytics(null);

    const isBakerOrAdmin = isAdmin || userRole === 'baker';

    if (!currentUser?.uid || !isBakerOrAdmin || authLoading) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const safetyTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn('[DataContext] Safety timeout — forcing loading=false');
        return false;
      });
    }, 6000);

    let loadingCleared = false;
    const clearLoadingOnce = () => {
      if (!loadingCleared) {
        loadingCleared = true;
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    };

    const unsubs = [];
    const uid = currentUser.uid;

    try {
      const rawUnsub = subscribeToOrders((data) => {
        setOrders(data || []);
        clearLoadingOnce();
      }, uid);
      unsubs.push(ListenerRegistry.register('orders', rawUnsub, { uid }));
    } catch (e) {
      console.error('[DataContext] Orders subscription failed:', e?.message);
      clearLoadingOnce();
    }

    try {
      const rawUnsub = subscribeToCustomers((data) => {
        setCustomers(data || []);
        clearLoadingOnce();
      }, null, uid);
      unsubs.push(ListenerRegistry.register('customers', rawUnsub, { uid }));
    } catch (e) {
      console.error('[DataContext] Customers subscription failed:', e?.message);
    }

    try {
      const rawUnsub = subscribeToInventory((data) => {
        setInventory(data || []);
        clearLoadingOnce();
      }, null, uid);
      unsubs.push(ListenerRegistry.register('inventory', rawUnsub, { uid }));
    } catch (e) {
      console.error('[DataContext] Inventory subscription failed:', e?.message);
    }

    try {
      const rawUnsub = subscribeToExpenses((data) => {
        setExpenses(data || []);
      }, null, uid);
      unsubs.push(ListenerRegistry.register('expenses', rawUnsub, { uid }));
    } catch (e) {
      console.error('[DataContext] Expenses subscription failed:', e?.message);
    }

    try {
      const rawUnsub = subscribeToShoppingList((data) => {
        setShoppingItems(data || []);
      }, null, uid);
      unsubs.push(ListenerRegistry.register('shoppingList', rawUnsub, { uid }));
    } catch (e) {
      console.error('[DataContext] Shopping subscription failed:', e?.message);
    }

    try {
      const rawUnsub = subscribeToProducts((data) => {
        setProducts(data || []);
        clearLoadingOnce();
      }, null, uid);
      unsubs.push(ListenerRegistry.register('products', rawUnsub, { uid }));
    } catch (e) {
      console.error('[DataContext] Products subscription failed:', e?.message);
    }

    try {
      const rawUnsub = subscribeToAnalyticsSummary(uid, (data) => {
        setAnalytics(data);
      });
      if (rawUnsub) {
        unsubs.push(ListenerRegistry.register('analytics_summary', rawUnsub, { uid }));
      }
    } catch (e) {
      console.error('[DataContext] Analytics subscription failed:', e?.message);
    }

    return () => {
      clearTimeout(safetyTimer);
      unsubs.forEach((unsub) => {
        try { if (typeof unsub === 'function') unsub(); } catch (_) {}
      });
    };
  }, [currentUser?.uid, userRole, isAdmin, authLoading]);

  // Memoize context value to prevent unneeded child component re-renders
  const contextValue = useMemo(() => ({
    orders, setOrders,
    customers, setCustomers,
    inventory, setInventory,
    expenses, setExpenses,
    shoppingItems, setShoppingItems,
    products, setProducts,
    business,
    analytics,
    loading
  }), [orders, customers, inventory, expenses, shoppingItems, products, business, analytics, loading]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
