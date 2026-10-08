import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Properly mock jsPDF as a constructor function
vi.mock('jspdf', () => {
  function MockJsPDF() {
    return {
      internal: {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
      },
      addImage: vi.fn(),
      addPage: vi.fn(),
      output: vi.fn().mockReturnValue(new Blob(['mock pdf content'], { type: 'application/pdf' })),
    };
  }
  return { default: MockJsPDF, jsPDF: MockJsPDF };
});

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn().mockImplementation(async (element) => {
    return {
      width: 794,
      height: 1123,
      toDataURL: () => 'data:image/jpeg;base64,mockdata',
    };
  }),
}));

// Mock nativeShare
vi.mock('../../services/nativeShare', () => ({
  nativeShareFile: vi.fn().mockResolvedValue({ shared: true }),
  saveFileToDocuments: vi.fn().mockResolvedValue({ path: '/documents/file.pdf' }),
  saveFileToCache: vi.fn().mockResolvedValue({ path: '/cache/file.pdf' }),
}));

// Mock createRoot to synchronously append template elements to the container in jsdom
vi.mock('react-dom/client', () => ({
  createRoot: (container) => ({
    render: (element) => {
      // Synchronously render a dummy element with the required IDs for html2canvas targeting
      container.innerHTML = `
        <div id="invoice-template-container"><h1>Invoice Template</h1></div>
        <div id="shopping-list-template-container"><h1>Shopping List Template</h1></div>
        <div id="report-pdf-container"><h1>Report Template</h1></div>
      `;
    },
    unmount: () => {
      container.innerHTML = '';
    },
  }),
}));

// Ensure URL.createObjectURL is mocked
if (typeof window !== 'undefined' && !window.URL.createObjectURL) {
  window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-uuid');
}

import { generateInvoicePdf, downloadInvoicePdf, shareInvoicePdf } from '../pdfGenerator';
import { generateShoppingListPdf, downloadShoppingPdf, shareShoppingListPdf } from '../shoppingPdfGenerator';
import { generateReportPdf, downloadReportPdf } from '../reportPdf';

describe('PDF Generation Suite', () => {
  const sampleBakery = {
    name: 'Cream & Crust Bakery',
    phone: '9876543210',
    address: '123 Baker Street',
    upiId: 'bakery@upi',
  };

  const sampleOrder = {
    id: 'ORD-101',
    orderId: 'ORD-101',
    customer: { name: 'Alice Smith', phone: '9123456789' },
    items: [
      { id: '1', name: 'Chocolate Truffle Cake', quantity: 1, price: 850 },
      { id: '2', name: 'Butter Croissant', quantity: 4, price: 120 },
    ],
    totalAmount: 1330,
    paidAmount: 500,
    paymentStatus: 'partial',
    createdAt: '2026-07-26',
    deliveryDate: '2026-07-27',
  };

  const sampleShoppingItems = [
    { id: '1', name: 'Dark Chocolate 70%', amountNeeded: 5, unit: 'kg' },
    { id: '2', name: 'All-Purpose Flour', amountNeeded: 25, unit: 'kg' },
  ];

  const sampleReport = {
    type: 'monthly',
    periodLabel: 'July 2026',
    totalRevenue: 45000,
    totalOrders: 65,
    topItems: [{ name: 'Truffle Cake', count: 20 }],
  };

  it('1. Invoice PDF - generates blob, file, and fileName correctly', async () => {
    const result = await generateInvoicePdf(sampleOrder, sampleBakery);
    expect(result).toBeDefined();
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.fileName).toContain('Invoice_ORD-101_Alice-Smith.pdf');
    expect(result.invoiceNumber).toBe('INV-ORD-101');
  }, 10000);

  it('2. Invoice PDF - downloads successfully', async () => {
    const result = await downloadInvoicePdf(sampleOrder, sampleBakery);
    expect(result.fileName).toContain('Invoice');
    expect(result.blob).toBeDefined();
  }, 10000);

  it('3. Invoice PDF - shares successfully via native share service', async () => {
    const result = await shareInvoicePdf(sampleOrder, sampleBakery);
    expect(result.shared).toBe(true);
  }, 10000);

  it('4. Shopping List PDF - generates blob and fileName correctly', async () => {
    const result = await generateShoppingListPdf(sampleShoppingItems, sampleBakery);
    expect(result).toBeDefined();
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.fileName).toContain('ShoppingList_');
  }, 10000);

  it('5. Shopping List PDF - downloads and shares correctly', async () => {
    const downloadRes = await downloadShoppingPdf(sampleShoppingItems, sampleBakery);
    expect(downloadRes.blob).toBeDefined();

    const shareRes = await shareShoppingListPdf(sampleShoppingItems, sampleBakery);
    expect(shareRes.shared).toBe(true);
  }, 10000);

  it('6. Analytics Report PDF - generates and triggers download correctly', async () => {
    const genResult = await generateReportPdf(sampleReport, sampleBakery);
    expect(genResult.blob).toBeInstanceOf(Blob);
    expect(genResult.fileName).toContain('Monthly_Report_July-2026.pdf');

    const downloadFileName = await downloadReportPdf(sampleReport, sampleBakery);
    expect(downloadFileName).toContain('Monthly_Report');
  }, 10000);
});
