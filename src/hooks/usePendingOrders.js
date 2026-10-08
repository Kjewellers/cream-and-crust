import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

export function usePendingOrders() {
  const { orders } = useData();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!orders) {
      setPendingCount(0);
      return;
    }
    const count = orders.filter((o) => {
      const s = String(o.status || 'inquiry').toLowerCase();
      return ['inquiry', 'confirmed', 'baking', 'ready', 'new'].includes(s);
    }).length;
    setPendingCount(count);
  }, [orders]);

  return pendingCount;
}
