import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import MenuRenderer from '../../components/menu/MenuRenderer';
import {
  getBusinessByUsername,
  subscribeToMenuSettings,
  subscribeToProducts,
} from '../../services/db';
import { auth } from '../../services/firebase';

export default function PublishedMenu() {
  const { username } = useParams();
  const [business, setBusiness] = useState(null);
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── Anonymous sign-in ───────────────────────────────────────────────────────
  // Sign the customer in anonymously ONLY when there is genuinely no Firebase
  // user after a settle-delay (~600ms). This prevents the menu from accidentally
  // replacing a baker's signed-in session.
  useEffect(() => {
    const SETTLED_KEY = 'cc_anon_attempted';
    let settleTimer = null;

    const unsub = onAuthStateChanged(auth, (user) => {
      if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }

      if (user) return; // Real or anonymous user present — never replace

      try {
        if (sessionStorage.getItem(SETTLED_KEY) === '1') return;
      } catch (_) { /* ignore */ }

      settleTimer = setTimeout(() => {
        if (auth.currentUser) return;
        try { sessionStorage.setItem(SETTLED_KEY, '1'); } catch (_) { /* ignore */ }
        signInAnonymously(auth).catch((e) => {
          console.warn('[PublishedMenu] Anonymous sign-in failed:', e?.code || e?.message);
        });
      }, 600);
    });

    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      unsub();
    };
  }, []);

  // ── Data subscriptions ──────────────────────────────────────────────────────
  // Use real-time listeners for BOTH menu settings and products.
  // Previously getMenuSettingsByUserId was a one-shot getDoc — template updates
  // made in the builder were NOT reflected in the shared link until a full
  // page refresh. subscribeToMenuSettings uses onSnapshot so any change the
  // baker makes is pushed to all active viewers instantly.
  useEffect(() => {
    let unsubSettings = null;
    let unsubProducts = null;
    let mounted = true;

    const load = async () => {
      console.log('[PublishedMenu] Loading for username:', username);

      const biz = await getBusinessByUsername(username);
      if (!mounted) return;

      if (!biz) {
        console.warn('[PublishedMenu] Business not found for username:', username);
        setNotFound(true);
        setLoading(false);
        return;
      }

      console.log('[PublishedMenu] Business found:', biz.id, biz.name);
      setBusiness(biz);

      // Real-time settings listener — updates whenever baker changes template
      unsubSettings = subscribeToMenuSettings(biz.id, (menuSettings) => {
        console.log('[PublishedMenu] Menu settings updated via onSnapshot');
        if (mounted) setSettings(menuSettings);
      });

      // Real-time products listener — already real-time in the old code too
      unsubProducts = subscribeToProducts(
        (items) => {
          console.log('[PublishedMenu] Products updated:', items?.length, 'items');
          if (mounted) {
            setProducts(items || []);
            setLoading(false);
          }
        },
        null,
        biz.id
      );
    };

    load().catch((e) => {
      console.error('[PublishedMenu] Load error:', e);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      if (unsubSettings) unsubSettings();
      if (unsubProducts) unsubProducts();
    };
  }, [username]);

  if (loading) {
    return (
      <div
        style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fffaf5' }}
      >
        <Sparkles className="animate-spin" color="#B5606A" />
      </div>
    );
  }

  if (notFound || !business) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          textAlign: 'center',
          background: '#fffaf5',
        }}
      >
        <div>
          <h1>Menu Not Found</h1>
          <p style={{ color: '#8C7A6B' }}>This bakery has not published a menu yet.</p>
        </div>
      </div>
    );
  }

  return <MenuRenderer business={business} settings={settings || {}} products={products} />;
}
