/**
 * dataExport.js — User data export utilities for Cream & Crust.
 *
 * Allows bakers to export their own business data as downloadable files.
 * This builds user trust and satisfies data portability requirements.
 *
 * Exports:
 *   - exportCustomersCSV(customers)  → downloads customers.csv
 *   - exportOrdersCSV(orders)        → downloads orders.csv
 *   - exportOrdersJSON(orders)       → downloads orders.json (for backup)
 *
 * No PII encryption used here — these are the user's OWN decrypted records
 * being exported at their explicit request for their own use.
 */

/**
 * Convert an array of objects to a CSV string.
 * @param {object[]} rows
 * @param {string[]} columns - ordered column names
 */
function toCSV(rows, columns) {
  const escape = (val) => {
    const s = String(val == null ? '' : val).replace(/"/g, '""');
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
  };
  const header = columns.map(escape).join(',');
  const body = rows
    .map((row) => columns.map((col) => escape(row[col] ?? '')).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

/**
 * Trigger a file download in the browser.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export customers to CSV.
 * @param {object[]} customers - already-decrypted customer records
 */
export function exportCustomersCSV(customers) {
  if (!customers?.length) return;
  const columns = ['name', 'phone', 'address', 'email', 'totalOrders', 'totalSpent', 'createdAt'];
  const csv = toCSV(customers, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, `cream-and-crust-customers-${date}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export orders to CSV.
 * @param {object[]} orders - already-decrypted order records
 */
export function exportOrdersCSV(orders) {
  if (!orders?.length) return;
  const columns = [
    'id',
    'customerName',
    'phone',
    'product',
    'size',
    'quantity',
    'price',
    'status',
    'paymentStatus',
    'paymentMethod',
    'deliveryDate',
    'deliveryAddress',
    'notes',
    'createdAt',
  ];
  const csv = toCSV(orders, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, `cream-and-crust-orders-${date}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export a full JSON backup of orders — useful for data portability.
 * @param {object[]} orders
 */
export function exportOrdersJSON(orders) {
  if (!orders?.length) return;
  const date = new Date().toISOString().split('T')[0];
  const json = JSON.stringify(orders, null, 2);
  downloadFile(json, `cream-and-crust-orders-backup-${date}.json`, 'application/json');
}

/**
 * Export inventory to CSV.
 * @param {object[]} items
 */
export function exportInventoryCSV(items) {
  if (!items?.length) return;
  const columns = ['item', 'stock', 'unit', 'minStock', 'category', 'costPerUnit', 'updatedAt'];
  const csv = toCSV(items, columns);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, `cream-and-crust-inventory-${date}.csv`, 'text/csv;charset=utf-8;');
}
