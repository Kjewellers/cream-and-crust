/**
 * Cream & Crust — Firestore Data Cleanup Script
 * Part 1 of Production Audit
 * 
 * This script deletes garbage/test data from Firestore:
 * - Orders: CC-104 (fake ₹15M), CXTfE, TFptt, jH65m, amounts >₹50k, customer="Customer"
 * - Inventory: "fk=Flour" entry
 * - Customers: "Customer", "Test UserTest User", "Test Order", "Test Customer"
 * 
 * Run from browser console or as a temporary page component.
 */

import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db, auth } from "../services/firebase";

const GARBAGE_ORDER_IDS = ['CC-104', 'CXTfE', 'TFptt', 'jH65m'];
const GARBAGE_CUSTOMER_NAMES = ['Customer', 'Test UserTest User', 'Test Order', 'Test Customer'];
const MAX_ORDER_AMOUNT = 50000;

export async function cleanFirestoreData() {
  const results = {
    ordersDeleted: [],
    inventoryDeleted: [],
    customersDeleted: [],
    errors: [],
  };

  // ===== CLEAN ORDERS =====
  try {
    const ordersSnap = await getDocs(query(collection(db, "orders"), where("uid", "==", auth.currentUser?.uid)));
    for (const docSnap of ordersSnap.docs) {
      const data = docSnap.data();
      const orderId = data.orderId || '';
      const total = Number(data.total) || Number(data.totalAmount) || 0;
      const customer = typeof data.customer === 'object' 
        ? (data.customer?.name || '') 
        : String(data.customer || data.customerName || '');
      
      let shouldDelete = false;
      let reason = '';

      // Check against known garbage order IDs
      if (GARBAGE_ORDER_IDS.includes(orderId) || GARBAGE_ORDER_IDS.includes(docSnap.id)) {
        shouldDelete = true;
        reason = `Garbage order ID: ${orderId || docSnap.id}`;
      }
      // Check for absurdly high amounts
      else if (total > MAX_ORDER_AMOUNT) {
        shouldDelete = true;
        reason = `Amount too high: ₹${total.toLocaleString('en-IN')}`;
      }
      // Check for generic "Customer" name
      else if (customer.trim() === 'Customer' || customer.trim() === '') {
        shouldDelete = true;
        reason = `Generic customer name: "${customer}"`;
      }

      if (shouldDelete) {
        await deleteDoc(doc(db, "orders", docSnap.id));
        results.ordersDeleted.push({ id: docSnap.id, orderId, reason });
        console.log(`🗑️ Deleted order: ${docSnap.id} (${reason})`);
      }
    }
  } catch (e) {
    results.errors.push(`Orders cleanup error: ${e.message}`);
    console.error('Orders cleanup error:', e);
  }

  // ===== CLEAN INVENTORY =====
  try {
    const invSnap = await getDocs(query(collection(db, "inventory"), where("uid", "==", auth.currentUser?.uid)));
    for (const docSnap of invSnap.docs) {
      const data = docSnap.data();
      const name = String(data.name || data.item || '').toLowerCase();
      
      if (name.includes('fk=') || name.includes('fk=flour')) {
        await deleteDoc(doc(db, "inventory", docSnap.id));
        results.inventoryDeleted.push({ id: docSnap.id, name: data.name || data.item });
        console.log(`🗑️ Deleted inventory: ${docSnap.id} (${name})`);
      }
    }
  } catch (e) {
    results.errors.push(`Inventory cleanup error: ${e.message}`);
    console.error('Inventory cleanup error:', e);
  }

  // ===== CLEAN CUSTOMERS =====
  try {
    const custSnap = await getDocs(query(collection(db, "customers"), where("uid", "==", auth.currentUser?.uid)));
    for (const docSnap of custSnap.docs) {
      const data = docSnap.data();
      const name = String(data.name || '').trim();
      const phone = String(data.phone || '').trim();
      
      // Delete garbage names, single-letter names, all-zero phones
      if (GARBAGE_CUSTOMER_NAMES.includes(name) || name === '' || name.length <= 1 || /^0+$/.test(phone)) {
        await deleteDoc(doc(db, "customers", docSnap.id));
        results.customersDeleted.push({ id: docSnap.id, name });
        console.log(`🗑️ Deleted customer: ${docSnap.id} (${name})`);
      }
    }
  } catch (e) {
    results.errors.push(`Customers cleanup error: ${e.message}`);
    console.error('Customers cleanup error:', e);
  }

  console.log('\n✅ CLEANUP COMPLETE');
  console.log(`Orders deleted: ${results.ordersDeleted.length}`);
  console.log(`Inventory deleted: ${results.inventoryDeleted.length}`);
  console.log(`Customers deleted: ${results.customersDeleted.length}`);
  if (results.errors.length > 0) {
    console.warn(`Errors: ${results.errors.length}`, results.errors);
  }

  return results;
}
