import { useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/iOS';
import { EventBus, EVENTS } from '../core/eventBus';

export function useLowStockAlert() {
  const { currentUser } = useAuth();
  const { inventory } = useData();
  const alertedItemsRef = useRef(new Set());

  useEffect(() => {
    if (!currentUser || !inventory) {
      alertedItemsRef.current.clear();
      return;
    }

    inventory.forEach((item) => {
      const isLow = Number(item.stock) <= Number(item.minStock || 0);
      if (isLow) {
        if (!alertedItemsRef.current.has(item.id)) {
          alertedItemsRef.current.add(item.id);
          showToast(
            `⚠️ Low Stock: "${item.item}" is down to ${item.stock} ${item.unit}!`,
            'error'
          );
          EventBus.emit(EVENTS.TRIGGER_HAPTIC, 'warning');
        }
      } else {
        alertedItemsRef.current.delete(item.id);
      }
    });
  }, [currentUser, inventory]);
}
