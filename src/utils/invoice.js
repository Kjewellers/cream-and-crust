/**
 * Print/share an invoice for an order.
 *
 * On web: opens a new window and triggers the browser print dialog.
 * On native Capacitor: generates the HTML as a blob and shares via
 * nativeShareFile, because window.open('', '_blank') returns null in
 * Android WebView, completely breaking the print flow.
 *
 * @param {object} order - The order data.
 * @param {object} [business] - Business profile (name, phone, address).
 */
import { Capacitor } from '@capacitor/core';
import { log } from './logger';

function buildInvoiceHTML(order, business = {}) {
  const o = order || {};
  const biz = business || {};

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${esc(o.id || '')}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { 
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
          color: #333; 
          line-height: 1.5;
        }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #C8956C; padding-bottom: 20px; margin-bottom: 20px; }
        .brand h1 { margin: 0; color: #3D2314; font-size: 28px; }
        .brand p { margin: 5px 0 0; color: #777; }
        .invoice-details { text-align: right; }
        .invoice-details h2 { margin: 0; color: #C8956C; font-size: 24px; }
        .customer-info { margin-bottom: 30px; display: flex; justify-content: space-between;}
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #3D2314; color: white; text-align: left; padding: 10px; font-weight: bold; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .totals { text-align: right; margin-top: 20px; }
        .totals-row { display: flex; justify-content: flex-end; padding: 5px 0; }
        .totals-row span:first-child { width: 150px; text-align: right; margin-right: 20px; }
        .totals-row span:last-child { width: 100px; text-align: right; font-weight: bold; }
        .grand-total { font-size: 1.2em; border-top: 2px solid #3D2314; padding-top: 10px; margin-top: 10px; }
        .footer { text-align: center; color: #777; font-size: 0.9em; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <h1>${esc(biz.name || 'Your Bakery')}</h1>
          <p>${esc(biz.tagline || 'Artisan Home Bakery')}<br>Contact: ${esc(biz.phone || biz.whatsapp || '')}</p>
        </div>
        <div class="invoice-details">
          <h2>INVOICE</h2>
          <p><strong>Order #:</strong> ${esc(o.id || '')}<br>
          <strong>Date:</strong> ${new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
        </div>
      </div>

      <div class="customer-info">
        <div>
          <h3>Bill To:</h3>
          <p>
            <strong>${esc(o.customer?.name || o.customerName || 'Customer')}</strong><br>
            Phone: ${esc(o.customer?.phone || o.phone || '')}<br>
            ${(o.customer?.address || o.deliveryAddress) ? `Address: ${esc(o.customer?.address || o.deliveryAddress)}` : ''}
          </p>
        </div>
        <div style="text-align: right">
          <h3>Payment Status:</h3>
          <p style="text-transform: uppercase; font-weight: bold; color: ${(o.paymentStatus || '').toLowerCase() === 'paid' ? 'green' : 'red'};">${esc(o.paymentStatus) || 'Pending'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Size</th>
            <th>Qty</th>
            <th style="text-align: right">Price</th>
            <th style="text-align: right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${Array.isArray(o.items) && o.items.length > 0 ? o.items.map(item => `
            <tr>
              <td>${esc(item?.name || o.product || 'Custom Order')}</td>
              <td>${esc(item?.size || o.size || '-')}</td>
              <td>${esc(item?.qty || 1)}</td>
              <td style="text-align: right">₹${esc(item?.price || o.total || 0)}</td>
              <td style="text-align: right">₹${esc((item?.price || 0) * (item?.qty || 1))}</td>
            </tr>
          `).join('') : `
            <tr>
              <td>${esc(o.product || 'Custom Order')}</td>
              <td>${esc(o.size || o.cakeWeight || '-')}</td>
              <td>1</td>
              <td style="text-align: right">₹${esc(o.total || o.totalAmount || 0)}</td>
              <td style="text-align: right">₹${esc(o.total || o.totalAmount || 0)}</td>
            </tr>
          `}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>₹${esc(o.total || o.totalAmount || 0)}</span>
        </div>
        ${Number(o.advance || 0) > 0 ? `
          <div class="totals-row">
            <span>Advance Paid:</span>
            <span>-₹${esc(o.advance)}</span>
          </div>
        ` : ''}
        <div class="totals-row grand-total">
          <span>Balance Due:</span>
          <span>₹${esc(Math.max(0, (Number(o.total || o.totalAmount || 0)) - Number(o.advance || 0)))}</span>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for your business!<br>Baked with love by ${esc(biz.name || 'Your Bakery')}. Enjoy your treats!</p>
      </div>
    </body>
    </html>
  `;
}

export function printInvoice(order, business = {}) {
  log.invoice('printInvoice: starting for order', order?.id);

  const html = buildInvoiceHTML(order, business);

  // On native Capacitor, window.open('', '_blank') returns null.
  // Instead, share the HTML as a downloadable file.
  if (Capacitor.isNativePlatform()) {
    log.invoice('printInvoice: native platform detected, using share flow');
    shareInvoiceAsHTML(html, order?.id || 'invoice')
      .catch(e => log.invoice.error('Native invoice share failed:', e?.message));
    return;
  }

  // Web: open in new window and print
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    log.invoice.warn('printInvoice: window.open blocked, trying download fallback');
    // Fallback: download as HTML file
    downloadInvoiceHTML(html, order?.id || 'invoice');
    return;
  }

  const printHTML = html.replace('</body>', `
    <script>
      window.onload = function() {
        window.print();
      }
    <\/script>
    </body>
  `);

  printWindow.document.write(printHTML);
  printWindow.document.close();
  log.invoice('printInvoice: web print window opened');
}

/**
 * Share invoice as an HTML file on native platforms.
 */
async function shareInvoiceAsHTML(html, orderId) {
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const { nativeShareFile } = await import('../services/nativeShare');
    await nativeShareFile({
      blob,
      fileName: `Invoice_${orderId}.html`,
      title: `Invoice #${orderId}`,
      text: 'Your invoice from the bakery',
      mimeType: 'text/html',
    });
    log.invoice('shareInvoiceAsHTML: shared successfully');
  } catch (e) {
    log.invoice.error('shareInvoiceAsHTML failed:', e?.message);
    // Last resort: try to open as data URL
    try {
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      window.open(dataUrl, '_blank');
    } catch { /* give up */ }
  }
}

/**
 * Download invoice as HTML file (popup-blocked fallback on web).
 */
function downloadInvoiceHTML(html, orderId) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice_${orderId}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  log.invoice('downloadInvoiceHTML: triggered download');
}

/** Escapes a value for safe HTML interpolation — prevents XSS via user-controlled data. */
function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
