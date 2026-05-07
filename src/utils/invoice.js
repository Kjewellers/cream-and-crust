export function printInvoice(order) {
  const printWindow = window.open('', '_blank');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${order.id}</title>
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
          <h1>🧁 Cream & Crust</h1>
          <p>Artisan Home Bakery<br>Contact: +91 9876543210</p>
        </div>
        <div class="invoice-details">
          <h2>INVOICE</h2>
          <p><strong>Order #:</strong> ${order.id}<br>
          <strong>Date:</strong> ${new Date(order.createdAt || Date.now()).toLocaleDateString()}</p>
        </div>
      </div>

      <div class="customer-info">
        <div>
          <h3>Bill To:</h3>
          <p>
            <strong>${order.customer.name}</strong><br>
            Phone: ${order.customer.phone}<br>
            ${order.customer.address ? `Address: ${order.customer.address}` : ''}
          </p>
        </div>
        <div style="text-align: right">
          <h3>Payment Status:</h3>
          <p style="text-transform: uppercase; font-weight: bold; color: ${order.paymentStatus === 'paid' ? 'green' : 'red'};">${order.paymentStatus || 'Pending'}</p>
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
          ${order.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.size}</td>
              <td>${item.qty}</td>
              <td style="text-align: right">₹${item.price}</td>
              <td style="text-align: right">₹${item.price * item.qty}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>₹${order.total}</span>
        </div>
        <!-- GST can be added here if needed -->
        <div class="totals-row grand-total">
          <span>Grand Total:</span>
          <span>₹${order.total}</span>
        </div>
      </div>

      <div class="footer">
        <p>Thank you for your business!<br>Baked with love. Enjoy your treats!</p>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
}
