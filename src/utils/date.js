/**
 * Robust formatting utilities for Cream & Crust
 */

export const formatDate = (val) => {
  if (val == null) return 'TBD';
  
  try {
    let date;
    
    // 1. Handle Firestore Timestamp
    if (typeof val.toDate === 'function') {
      date = val.toDate();
    } else if (val.seconds !== undefined) {
      date = new Date(val.seconds * 1000);
    } 
    // 2. Handle Date objects
    else if (val instanceof Date) {
      date = val;
    }
    // 3. Handle strings/numbers
    else {
      date = new Date(val);
    }

    if (isNaN(date.getTime())) {
      if (typeof val === 'string' && val.length > 0) return val;
      return 'TBD';
    }

    // Format: 09 May 2026
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-IN', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (err) {
    return typeof val === 'string' ? val : 'TBD';
  }
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  
  // Try to parse HH:mm
  try {
    const [hoursStr, minutesStr] = String(timeStr).split(':');
    if (hoursStr !== undefined && minutesStr !== undefined) {
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (!isNaN(hours) && !isNaN(minutes)) {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const mins = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${mins} ${ampm}`;
      }
    }
    return timeStr; // Return as-is if parsing fails
  } catch (e) {
    return timeStr;
  }
};

export const formatCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};

export const formatOrderNumber = (order, allOrders = []) => {
  if (!order) return '#000';
  
  // If we don't have all orders, we can't reliably generate a sequential number.
  // In a real app, this should be an incrementing field in Firestore.
  // For this audit, we'll try to find its index if allOrders is provided,
  // or use a hash of the ID to generate a consistent 3-digit number.
  
  if (allOrders && allOrders.length > 0) {
    // Sort all orders by createdAt
    const sorted = [...allOrders].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
    
    const index = sorted.findIndex(o => o.id === order.id);
    if (index !== -1) {
      return `#${String(index + 1).padStart(3, '0')}`;
    }
  }

  // Fallback: use part of the ID
  const hash = order.id ? order.id.replace(/\D/g, '').slice(0, 3) : '001';
  return `#${String(hash || '001').padStart(3, '0')}`;
};

export const toISODate = (val) => {
  if (!val) return '';
  try {
    let date;
    
    // 1. Handle Firestore Timestamp
    if (typeof val.toDate === 'function') {
      date = val.toDate();
    } else if (val.seconds !== undefined) {
      date = new Date(val.seconds * 1000);
    } 
    // 2. Handle Date objects
    else if (val instanceof Date) {
      date = val;
    }
    // 3. Handle strings/numbers
    else {
      date = new Date(val);
    }

    if (isNaN(date.getTime())) {
      return String(val);
    }

    return date.toISOString().split('T')[0];
  } catch (err) {
    return String(val);
  }
};
