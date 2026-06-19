import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ShoppingListPdfTemplate from '../components/shopping/ShoppingListPdfTemplate';
import { nativeShareFile, saveFileToDocuments, saveFileToCache } from '../services/nativeShare';

const cleanFilePart = (value, fallback = 'List') =>
  String(value || fallback)
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || fallback;

const getBakeryName = (bakeryProfile = {}) =>
  bakeryProfile.name || bakeryProfile.bakeryName || bakeryProfile.businessName || 'Cream & Crust';

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

export const generateShoppingListPdf = async (items, bakeryProfile, options = {}) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-10000px';
  container.style.width = '794px';
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    root.render(
      <ShoppingListPdfTemplate
        items={items}
        bakeryProfile={bakeryProfile}
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 650));

    const element = document.getElementById('shopping-list-template-container');
    if (!element) throw new Error('Shopping List template container not found');
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
    const bakery = cleanFilePart(getBakeryName(bakeryProfile), 'Bakery');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${bakery}_ShoppingList_${dateStr}.pdf`;
    
    const file = new File([blob], fileName, { type: 'application/pdf' });
    const objectUrl = URL.createObjectURL(blob);

    return {
      blob,
      file,
      fileName,
      objectUrl,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
};

export const downloadShoppingPdf = async (items, bakeryProfile) => {
  console.log('[PDF] downloadShoppingPdf: generating...');
  const result = await generateShoppingListPdf(items, bakeryProfile);
  console.log('[PDF] downloadShoppingPdf: saving file:', result.fileName);

  await saveFileToDocuments({ blob: result.blob, fileName: result.fileName });

  console.log('[PDF] downloadShoppingPdf: done');
  return result;
};

export const shareShoppingListPdf = async (items, bakeryProfile) => {
  console.log('[PDF] shareShoppingListPdf: generating...');
  const result = await generateShoppingListPdf(items, bakeryProfile);
  const bakeryName = getBakeryName(bakeryProfile);

  console.log('[PDF] shareShoppingListPdf: sharing file:', result.fileName);

  try {
    const shareResult = await nativeShareFile({
      blob: result.blob,
      fileName: result.fileName,
      title: `${bakeryName} Shopping List`,
      text: `Here is the shopping list from ${bakeryName}`,
      mimeType: 'application/pdf',
    });
    console.log('[PDF] shareShoppingListPdf: share result:', shareResult);
    return { ...result, shared: shareResult.shared };
  } catch (e) {
    console.error('[PDF] shareShoppingListPdf: share failed:', e?.message || e);
    // Last-resort: trigger download
    await saveFileToCache({ blob: result.blob, fileName: result.fileName });
    return { ...result, shared: false };
  }
};
