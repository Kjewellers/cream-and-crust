/**
 * SafeImage — lazy, progressive image with a placeholder fallback.
 *
 *  - Defers loading until within ~250px of the viewport (IntersectionObserver
 *    + native loading="lazy").
 *  - Shows a low-res thumbnail placeholder, then swaps to the full image.
 *  - Falls back to a placeholder asset if the image fails to load.
 *
 * Requirements: 1.5 (missing image -> placeholder), 11.2 (thumbnail variant),
 * 11.3 (progressive), 11.4 (lazy until near viewport).
 */
import React, { useEffect, useRef, useState } from 'react';

export default function SafeImage({
  src,
  thumbnailSrc,
  alt = '',
  fallback = '/logo.png',
  rootMargin = '250px',
  style,
  ...rest
}) {
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (inView) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, rootMargin]);

  const displaySrc = errored ? fallback : inView ? src : thumbnailSrc || undefined;

  return (
    <img
      ref={ref}
      src={displaySrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setErrored(true)}
      style={{
        transition: 'opacity var(--dur-base, 250ms) ease',
        opacity: loaded || errored || thumbnailSrc ? 1 : 0.4,
        ...style,
      }}
      {...rest}
    />
  );
}
