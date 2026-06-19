import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import InvoiceTemplate from '../components/orders/InvoiceTemplate';
import { nativeShareFile, saveFileToDocuments, saveFileToCache } from '../services/nativeShare';

const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';

const cleanFilePart = (value, fallback = 'invoice') =>
  String(value || fallback)
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || fallback;

const getCustomerName = (order = {}) => {
  if (typeof order.customer === 'object' && order.customer?.name) return order.customer.name;
  return order.customerName || order.customer || 'Customer';
};

const getBakeryName = (bakeryProfile = {}) =>
  bakeryProfile.name || bakeryProfile.bakeryName || bakeryProfile.businessName || 'Cream & Crust';

export const createInvoiceNumber = (order = {}) => {
  const id = order.orderId || order.id || Date.now();
  return `INV-${String(id).replace(/^#?INV-?/i, '').replace(/^#/, '').toUpperCase()}`;
};

export const createInvoiceFileName = (order = {}, bakeryProfile = {}) => {
  const bakery = cleanFilePart(getBakeryName(bakeryProfile), 'Cream-and-Crust');
  const customer = cleanFilePart(getCustomerName(order), 'Customer');
  const orderId = cleanFilePart(order.orderId || order.id || Date.now(), 'Order');
  return `${bakery}_Invoice_${orderId}_${customer}.pdf`;
};

const waitForImages = async (element) => {
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
};

export const generateInvoicePdf = async (order, bakeryProfile, options = {}) => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.zIndex = '-9999';
  container.style.width = '794px';
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  document.body.appendChild(container);

  const root = createRoot(container);
  const invoiceNumber = options.invoiceNumber || createInvoiceNumber(order);

  try {
    root.render(
      <InvoiceTemplate
        order={order}
        bakeryProfile={bakeryProfile}
        invoiceNumber={invoiceNumber}
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 650));

    const element = document.getElementById('invoice-template-container');
    if (!element) throw new Error('Invoice template container not found');
    await waitForImages(element);

    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      useCORS: true,
      backgroundColor: '#FFFDFC',
      logging: false,
    });

    const pdf = new jsPDF('p', 'mm', 'a4', true);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL('image/jpeg', options.quality || 0.92);
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    // Slice the canvas across pages. PAGE_SLACK_MM tolerates the small
    // overhang that comes from `imgHeight = canvas.height * pageWidth /
    // canvas.width` plus the few millimetres of CSS slack between the
    // template's natural content height and an exact A4 page height.
    //
    // Without this, a small invoice (2–3 items) routinely produces a
    // phantom blank page 2 because the rasterised image ends up only
    // 5–15 mm taller than the A4 page boundary. Truly multi-page invoices
    // overhang by a full pageHeight (297 mm) so a 15 mm tolerance never
    // swallows a real second page.
    const PAGE_SLACK_MM = 15;
    let remainingHeight = imgHeight;
    let y = 0;
    pdf.addImage(imgData, 'JPEG', 0, y, pageWidth, imgHeight, undefined, 'FAST');
    remainingHeight -= pageHeight;

    while (remainingHeight > PAGE_SLACK_MM) {
      y -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, y, pageWidth, imgHeight, undefined, 'FAST');
      remainingHeight -= pageHeight;
    }

    const blob = pdf.output('blob');
    const fileName = createInvoiceFileName(order, bakeryProfile);
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const objectUrl = URL.createObjectURL(blob);

    return {
      blob,
      file,
      fileName,
      objectUrl,
      invoiceNumber,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
};

export const downloadInvoicePdf = async (order, bakeryProfile) => {
  console.log('[PDF] downloadInvoicePdf: generating...');
  const result = await generateInvoicePdf(order, bakeryProfile);
  console.log('[PDF] downloadInvoicePdf: saving file:', result.fileName);

  await saveFileToDocuments({ blob: result.blob, fileName: result.fileName });

  console.log('[PDF] downloadInvoicePdf: done');
  return result;
};

export const shareInvoicePdf = async (order, bakeryProfile) => {
  console.log('[PDF] shareInvoicePdf: generating...');
  const result = await generateInvoicePdf(order, bakeryProfile);
  const customerName = getCustomerName(order);
  const bakeryName = getBakeryName(bakeryProfile);

  console.log('[PDF] shareInvoicePdf: sharing file:', result.fileName);

  try {
    const shareResult = await nativeShareFile({
      blob: result.blob,
      fileName: result.fileName,
      title: `${bakeryName} Invoice for ${customerName}`,
      text: `Invoice ${result.invoiceNumber} from ${bakeryName}`,
      mimeType: 'application/pdf',
    });
    console.log('[PDF] shareInvoicePdf: share result:', shareResult);
    return { ...result, shared: shareResult.shared };
  } catch (e) {
    console.error('[PDF] shareInvoicePdf: share failed:', e?.message || e);
    // Last-resort: trigger download
    await saveFileToCache({ blob: result.blob, fileName: result.fileName });
    return { ...result, shared: false };
  }
};

const uploadInvoicePdf = async (pdfResult) => {
  if (CLOUDINARY_CLOUD_NAME === 'demo') return null;

  const formData = new FormData();
  formData.append('file', pdfResult.blob, pdfResult.fileName);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('resource_type', 'raw');

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`, {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.secure_url) {
    throw new Error(uploadData.error?.message || 'Invoice upload failed');
  }
  return uploadData.secure_url;
};

/**
 * Backward-compatible helper used by Orders.
 * Returns a public URL when Cloudinary is configured, otherwise a local object URL for download.
 */
export const generateAndUploadInvoice = async (order, bakeryProfile) => {
  const pdfResult = await generateInvoicePdf(order, bakeryProfile);
  const uploadedUrl = await uploadInvoicePdf(pdfResult);
  return uploadedUrl || pdfResult.objectUrl;
};
