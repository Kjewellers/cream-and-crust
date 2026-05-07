import { createContext, useContext, useState, useEffect } from 'react';
import storage from '../utils/storage';
import { products as defaultProducts, sampleOrders, sampleCustomers } from '../data/sampleData';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [products, setProducts] = useState(() => {
    const stored = storage.getProducts();
    if (stored.length === 0) {
      storage.setProducts(defaultProducts);
      return defaultProducts;
    }
    return stored;
  });

  const [orders, setOrders] = useState(() => {
    const stored = storage.getOrders();
    if (stored.length === 0) {
      storage.setOrders(sampleOrders);
      return sampleOrders;
    }
    return stored;
  });

  const [customers, setCustomers] = useState(() => {
    const stored = storage.getCustomers();
    if (stored.length === 0) {
      storage.setCustomers(sampleCustomers);
      return sampleCustomers;
    }
    return stored;
  });

  useEffect(() => { storage.setProducts(products); }, [products]);
  useEffect(() => { storage.setOrders(orders); }, [orders]);
  useEffect(() => { storage.setCustomers(customers); }, [customers]);

  // Product CRUD
  const addProduct = (product) => {
    const newProduct = { ...product, id: Date.now() };
    setProducts(prev => [...prev, newProduct]);
    return newProduct;
  };

  const updateProduct = (id, updates) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const deleteProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const toggleProductAvailability = (id) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, available: !p.available } : p))
    );
  };

  // Order management
  const addOrder = (order) => {
    const newOrder = {
      ...order,
      id: `CC-${String(orders.length + 1).padStart(3, '0')}`,
    };
    setOrders(prev => [newOrder, ...prev]);

    // Update customer
    const cust = customers.find(c => c.phone === order.customer.phone);
    if (cust) {
      setCustomers(prev =>
        prev.map(c =>
          c.phone === order.customer.phone
            ? {
                ...c,
                totalOrders: c.totalOrders + 1,
                totalSpent: c.totalSpent + order.total,
                lastOrder: new Date().toISOString().split('T')[0],
              }
            : c
        )
      );
    } else {
      setCustomers(prev => [
        ...prev,
        {
          id: Date.now(),
          name: order.customer.name,
          phone: order.customer.phone,
          address: order.customer.address,
          totalOrders: 1,
          totalSpent: order.total,
          lastOrder: new Date().toISOString().split('T')[0],
        },
      ]);
    }

    return newOrder;
  };

  const updateOrderStatus = (orderId, status) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status } : o))
    );
  };

  const updateOrderPayment = (orderId, paymentStatus, paymentMethod) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId
          ? { ...o, paymentStatus, paymentMethod: paymentMethod || o.paymentMethod }
          : o
      )
    );
  };

  const deleteOrder = (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // Customer management
  const deleteCustomer = (id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const updateCustomer = (id, updates) => {
    setCustomers(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  return (
    <DataContext.Provider value={{
      products, addProduct, updateProduct, deleteProduct, toggleProductAvailability,
      orders, addOrder, updateOrderStatus, updateOrderPayment, deleteOrder,
      customers, deleteCustomer, updateCustomer,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
