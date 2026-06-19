import React from 'react';
import { createRoot } from 'react-dom/client';
import ReportPdfTemplate from '../components/reports/ReportPdfTemplate';
import { saveFileToDocuments } from '../services/nativeShare';

const cleanPart = (v, fallback = 'report') =>
  String(v || fallback)
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || fallback;

const waitForImages = async (el) => {
  const imgs = Array.from(el.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          })
    )
  );
};

/**
 * Render the report template off-screen, rasterise it, and return a jsPDF blob.
 * Dynamically imports html2canvas + jspdf so they're not in the main bundle.
 */
export async function generateReportPdf(report, bakery = {}) {
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
    root.render(<ReportPdfTemplate report={report} bakery={bakery} />);
    await new Promise((r) => setTimeout(r, 600));

    const el = document.getElementById('report-pdf-container');
    if (!el) throw new Error('Report template not found');
    await waitForImages(el);

    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FFFDFA',
      logging: false,
    });

    const pdf = new jsPDF('p', 'mm', 'a4', true);
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgH = (canvas.height * pageW) / canvas.width;

    const SLACK = 15;
    let remaining = imgH;
    let y = 0;
    pdf.addImage(imgData, 'JPEG', 0, y, pageW, imgH, undefined, 'FAST');
    remaining -= pageH;
    while (remaining > SLACK) {
      y -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, y, pageW, imgH, undefined, 'FAST');
      remaining -= pageH;
    }

    const blob = pdf.output('blob');
    const fileName = `${cleanPart(bakery.name || 'Cream-and-Crust')}_${
      report.type === 'monthly' ? 'Monthly' : 'Weekly'
    }_Report_${cleanPart(report.periodLabel, 'period')}.pdf`;
    return { blob, fileName, objectUrl: URL.createObjectURL(blob) };
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

/** Generate + trigger a download. */
export async function downloadReportPdf(report, bakery = {}) {
  const { blob, fileName } = await generateReportPdf(report, bakery);
  await saveFileToDocuments({ blob, fileName });
  return fileName;
}
