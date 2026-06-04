import '@testing-library/jest-dom';

// Initialize i18n for tests so useTranslation works
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../i18n/locales/en.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

// jsdom doesn't ship IntersectionObserver. framer-motion's useInView crashes
// without it. Provide a no-op polyfill that immediately reports "in view".
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    constructor(cb) {
      this._cb = cb;
    }
    observe(target) {
      // Fire once immediately so useInView returns true.
      this._cb([
        {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: target.getBoundingClientRect ? target.getBoundingClientRect() : {},
          intersectionRect: {},
          rootBounds: null,
          time: 0,
        },
      ]);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.IntersectionObserver = IntersectionObserverStub;
}

// matchMedia is also missing in jsdom — needed by prefers-reduced-motion check.
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
