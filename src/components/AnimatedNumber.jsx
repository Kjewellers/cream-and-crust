import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useTransform, useSpring } from 'framer-motion';

/**
 * AnimatedNumber — Apple Wallet–style count-up.
 *
 * Animates from 0 to `value` when first scrolled into view, and re-animates
 * smoothly between subsequent value changes.
 *
 * @param {number} value          — target number (can be currency, count, percent)
 * @param {string} prefix         — e.g. '₹'
 * @param {string} suffix         — e.g. '%', ' orders'
 * @param {number} decimals       — fractional digits (0 default)
 * @param {string} locale         — toLocaleString locale (default 'en-IN')
 * @param {boolean} useGrouping   — comma separators (default true)
 * @param {number} duration       — seconds (default 1.1)
 * @param {object} style          — passthrough style to <span>
 */
export default function AnimatedNumber({
  value = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  locale = 'en-IN',
  useGrouping = true,
  duration = 1.1,
  style,
  className,
}) {
  const ref = useRef(null);
  // useInView relies on IntersectionObserver which is not present in
  // jsdom (test env). Detect and fall back to "always in view".
  const hasIO = typeof window !== 'undefined' && typeof window.IntersectionObserver !== 'undefined';
  const inViewHook = useInView(ref, { once: true, amount: 0.3 });
  const inView = hasIO ? inViewHook : true;
  const motionValue = useMotionValue(0);
  const hasAnimatedRef = useRef(false);
  // Spring smooths intermediate updates (e.g. when `value` re-renders).
  const spring = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
    stiffness: 70,
    damping: 22,
  });
  const display = useTransform(spring, (latest) => {
    const n = Number.isFinite(latest) ? latest : 0;
    const fixed = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
    if (!useGrouping) return `${prefix}${fixed}${suffix}`;
    try {
      const num = Number(fixed);
      const formatted = num.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${prefix}${formatted}${suffix}`;
    } catch {
      return `${prefix}${fixed}${suffix}`;
    }
  });

  const [text, setText] = useState(() => {
    const fixed =
      decimals > 0
        ? Number(value || 0).toFixed(decimals)
        : Math.round(Number(value || 0)).toString();
    try {
      return `${prefix}${Number(fixed).toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    } catch {
      return `${prefix}${fixed}${suffix}`;
    }
  });

  useEffect(() => {
    if (!inView) return;
    motionValue.set(Number(value || 0));
    hasAnimatedRef.current = true;
  }, [inView, value, motionValue]);

  useEffect(() => {
    const unsub = display.on('change', (v) => setText(v));
    return () => unsub();
  }, [display]);

  // Reduced motion: skip animation, render final value immediately.
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    const fixed =
      decimals > 0
        ? Number(value || 0).toFixed(decimals)
        : Math.round(Number(value || 0)).toString();
    let formatted;
    try {
      formatted = Number(fixed).toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch {
      formatted = fixed;
    }
    return (
      <span ref={ref} className={className} style={style}>
        {prefix}
        {formatted}
        {suffix}
      </span>
    );
  }

  return (
    <motion.span
      ref={ref}
      className={className}
      style={style}
      // Use inert text node so screen readers don't announce every interim value.
      aria-label={`${prefix}${value}${suffix}`}
    >
      {text}
    </motion.span>
  );
}
