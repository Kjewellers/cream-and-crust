/**
 * imagePipeline.js — client-side image processing (WebP, downscale, thumbnail).
 *
 * Prevents oversized images from crashing iPhone Safari by downscaling before
 * render, and converts uploads to WebP for smaller, faster-loading media.
 *
 * `fitWithin` is pure and fully property-testable. The canvas-based helpers
 * depend on the DOM and are exercised by example tests.
 *
 * Requirements: 11.1 (WebP convert), 11.2 (thumbnail <= 480), 11.5 (downscale
 * longest edge <= 2048), 11.6 (reject unsupported/failed input).
 */

export const MAX_UPLOAD_EDGE = 2048;
export const MAX_THUMBNAIL_EDGE = 480;

/**
 * Compute target dimensions so the longest edge does not exceed `maxEdge`,
 * preserving aspect ratio. Pure. Never upscales (images smaller than maxEdge
 * are returned unchanged, rounded to integers).
 *
 * @param {number} width
 * @param {number} height
 * @param {number} maxEdge
 * @returns {{ width: number, height: number }}
 */
export function fitWithin(width, height, maxEdge) {
  const w = Number(width);
  const h = Number(height);
  const max = Number(maxEdge);

  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: 0, height: 0 };
  }
  if (!Number.isFinite(max) || max <= 0) {
    return { width: Math.round(w), height: Math.round(h) };
  }

  const longest = Math.max(w, h);
  if (longest <= max) {
    return { width: Math.round(w), height: Math.round(h) };
  }

  const scale = max / longest;
  // Floor so the longest edge can never round up past maxEdge.
  return {
    width: Math.max(1, Math.floor(w * scale)),
    height: Math.max(1, Math.floor(h * scale)),
  };
}

/** Load a File/Blob into an HTMLImageElement. Rejects on decode failure. */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new Error('Unsupported input: not an image file'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image could not be decoded'));
    };
    img.src = url;
  });
}

/** Draw an image onto a canvas at target dimensions and export as WebP Blob. */
function canvasToWebP(img, width, height, quality) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('WebP conversion failed'));
        },
        'image/webp',
        quality
      );
    } catch (e) {
      reject(e instanceof Error ? e : new Error('WebP conversion failed'));
    }
  });
}

/**
 * Convert a File/Blob to a WebP Blob, downscaling so the longest edge does not
 * exceed `maxEdge`. Rejects on unsupported/failed input, producing no partial
 * output (Req 11.1, 11.5, 11.6).
 *
 * @param {Blob} file
 * @param {{ maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<Blob>}
 */
export async function toWebP(file, { maxEdge = MAX_UPLOAD_EDGE, quality = 0.82 } = {}) {
  const img = await loadImage(file);
  const { width, height } = fitWithin(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    maxEdge
  );
  if (width <= 0 || height <= 0) throw new Error('Image has invalid dimensions');
  return canvasToWebP(img, width, height, quality);
}

/**
 * Process an upload: validate -> downscale to <= 2048 -> WebP.
 * Rejects bad input and stores nothing (Req 11.5, 11.6).
 */
export async function processUpload(file, { quality = 0.82 } = {}) {
  return toWebP(file, { maxEdge: MAX_UPLOAD_EDGE, quality });
}

/** Produce a thumbnail WebP Blob with longest edge <= 480 (Req 11.2). */
export async function makeThumbnail(file, { maxEdge = MAX_THUMBNAIL_EDGE, quality = 0.7 } = {}) {
  return toWebP(file, { maxEdge, quality });
}
