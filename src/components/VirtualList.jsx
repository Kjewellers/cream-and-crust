/**
 * VirtualList — incremental (windowed) rendering for long lists.
 *
 * Renders a growing window of items and appends more as a sentinel element
 * nears the viewport, so the visible region is never blank and large lists
 * stay smooth on low-end devices. Windowing math lives in utils/listWindow.js.
 *
 * Requirements: 5.1.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { growWindow, initWindow } from '../utils/listWindow.js';

export default function VirtualList({
  items = [],
  renderItem,
  initialCount = 20,
  step = 20,
  getKey,
  rootMargin = '600px',
}) {
  const total = items.length;
  const [count, setCount] = useState(() => initWindow(total, initialCount));
  const sentinelRef = useRef(null);

  // Reset the window when the list shrinks below the current count.
  useEffect(() => {
    setCount((c) => Math.min(Math.max(initWindow(total, initialCount), c), total));
  }, [total, initialCount]);

  useEffect(() => {
    if (count >= total) return undefined;
    const el = sentinelRef.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setCount((c) => growWindow(c, { total, step }));
      return undefined;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => growWindow(c, { total, step }));
        }
      },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [count, total, step, rootMargin]);

  const visible = useMemo(() => items.slice(0, count), [items, count]);

  return (
    <>
      {visible.map((item, i) => (
        <React.Fragment key={getKey ? getKey(item, i) : (item?.id ?? i)}>
          {renderItem(item, i)}
        </React.Fragment>
      ))}
      {count < total ? <div ref={sentinelRef} aria-hidden style={{ height: 1 }} /> : null}
    </>
  );
}
