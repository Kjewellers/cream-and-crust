import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToOrders,
  subscribeToCustomers,
  subscribeToInventory,
  subscribeToExpenses,
  subscribeToBusiness,
  subscribeToProducts,
  subscribeToShoppingList
} from '../services/db';
import { subscribeToAnalyticsSummary } from '../services/menuAnalytics';

export const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser, userRole, isAdmin } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [business, setBusiness] = useState(null);
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
    setBusiness(null);
    setAnalytics(null);

    // Only fetch baker/admin data if they are logged in with the correct role
    // Customers (userRole === 'customer') don't need all this global data.
    const isBakerOrAdmin = isAdmin || userRole === 'baker';
    
    if (!currentUser?.uid || !isBakerOrAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubOrders = subscribeToOrders((data) => {
      setOrders(data || []);
      setLoading(false); // Consider the app "loaded" once orders arrive
    }, currentUser.uid);

    const unsubCustomers = subscribeToCustomers((data) => {
      setCustomers(data || []);
    }, null, currentUser.uid);

    const unsubInventory = subscribeToInventory((data) => {
      setInventory(data || []);
    }, null, currentUser.uid);

    const unsubExpenses = subscribeToExpenses((data) => {
      setExpenses(data || []);
    }, null, currentUser.uid);

    const unsubShopping = subscribeToShoppingList((data) => {
      setShoppingItems(data || []);
    }, null, currentUser.uid);

    const unsubBusiness = subscribeToBusiness((data) => {
      setBusiness(data);
    }, null, currentUser.uid);

    const unsubProducts = subscribeToProducts((data) => {
      setProducts(data || []);
    }, null, currentUser.uid);

    const unsubAnalytics = subscribeToAnalyticsSummary(currentUser.uid, (data) => {
      setAnalytics(data);
    });

    return () => {
      unsubOrders();
      unsubCustomers();
      unsubInventory();
      unsubExpenses();
      unsubShopping();
      unsubBusiness();
      unsubProducts();
      if (unsubAnalytics) unsubAnalytics();
    };
  }, [currentUser?.uid, userRole, isAdmin]);

  return (
    <DataContext.Provider value={{
      orders, setOrders,
      customers, setCustomers,
      inventory, setInventory,
      expenses, setExpenses,
      shoppingItems, setShoppingItems,
      products, setProducts,
      business,
      analytics,
      loading
    }}>
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
