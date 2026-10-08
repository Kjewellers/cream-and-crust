import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Sliders,
  Trash2,
  Download,
  Info,
  ChevronRight,
  User as UserIcon,
  Mail,
  MessageCircle,
  BellRing,
  ShieldCheck,
  FileText,
  RefreshCw,
  Globe,
  Check,
  ExternalLink,
  Lock,
  Sparkles,
  LayoutGrid,
  Palette,
  HardDrive,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserDoc, updateUserDoc, getBusinessByUserId, getMenuSettingsByUserId } from '../services/db';
import { showToast, triggerHaptic } from '../components/iOS';
import { useTranslation } from 'react-i18next';
import { resetAllModuleTours } from '../components/ModuleTour';
import { resetAllDemos } from '../components/AnimatedDemo';
import SubscriptionCard from '../components/SubscriptionCard';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { restorePurchases, isNativeAndroidRuntime } from '../services/purchases';
import PremiumBadge from '../components/premium/PremiumBadge';
import { loadNotificationPreferences, updateNotificationPreferences, DEFAULT_PREFERENCES } from '../services/notifications/NotificationPreferences';
import BackupSettingsScreen from '../components/backup/BackupSettingsScreen';

const APP_VERSION = '1.1.16';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', label: 'Japanese', native: '日本語', flag: '🇯🇵' },
];

/* Enhanced Section card wrapper with smooth hover & elevation */
function Section({ icon: Icon, iconBg, iconColor, title, description, children, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'var(--card)',
        borderRadius: 22,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '22px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: iconBg || 'var(--accent-lt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: iconColor || 'var(--accent)',
              flexShrink: 0,
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)',
            }}
          >
            <Icon size={19} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--text)' }}>
              {title}
            </h3>
            {description && (
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.4 }}>
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </motion.div>
  );
}

/* iOS-style tactile toggle switch */
function Toggle({ on, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      style={{
        width: 48,
        height: 28,
        borderRadius: 99,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? 'var(--accent)' : 'var(--border-md)',
        position: 'relative',
        transition: 'background 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
        boxShadow: on ? '0 2px 8px rgba(181,96,106,0.35)' : 'none',
      }}
    >
      <motion.div
        animate={{ x: on ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
        style={{
          position: 'absolute',
          top: 2,
          left: 0,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 2px 5px rgba(0,0,0,0.22)',
        }}
      />
    </button>
  );
}

/* Tactile row item */
function Row({ children, onClick, last }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s ease',
      }}
    >
      {children}
    </div>
  );
}

/** Inline premium status widget for Settings page */
function PremiumStatusWidget({ navigate }) {
  const { isPro, isTrial, trialDaysRemaining, openPaywall, expiryDate } = useSubscriptionContext();
  const [restoring, setRestoring] = React.useState(false);
  const isNative = isNativeAndroidRuntime();

  const handleRestore = async () => {
    if (!isNative) {
      showToast('Restore is only available in the Android app', 'info');
      return;
    }
    setRestoring(true);
    try {
      await restorePurchases();
      showToast('✅ Purchases restored!', 'success');
    } catch (e) {
      showToast(e?.message || 'Restore failed', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const validExpiryDate = expiryDate && new Date(expiryDate).getTime() > Date.now() ? new Date(expiryDate) : null;
  const expiryLabel = validExpiryDate
    ? validExpiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 22,
        border: isPro ? '1.5px solid rgba(212,160,80,0.4)' : '1px solid var(--border)',
        background: isPro
          ? 'linear-gradient(135deg, rgba(255,248,240,0.95) 0%, rgba(255,243,232,0.9) 60%, #FFFDF9 100%)'
          : 'var(--card)',
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isPro ? '0 10px 30px rgba(212,160,80,0.12)' : 'var(--shadow-sm)',
      }}
    >
      {/* Gold shimmer for active */}
      {isPro && (
        <motion.div
          animate={{ x: [-200, 600] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: 0, left: 0, width: 90, height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(212,160,80,0.15), transparent)',
            transform: 'skewX(-20deg)', pointerEvents: 'none',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16, flexShrink: 0,
            background: isPro ? 'linear-gradient(135deg, #D4A050, #F5D78E)' : 'var(--accent-lt)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
            boxShadow: isPro ? '0 6px 16px rgba(212,160,80,0.35)' : 'none',
          }}>
            {isPro ? '👑' : '🧁'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.015em' }}>
                {isPro ? (isTrial ? 'Free Trial Active' : 'Cream & Crust Pro') : 'Free Plan'}
              </span>
              {isPro && <PremiumBadge variant="pro" size="sm" />}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 3 }}>
              {isPro && isTrial && trialDaysRemaining !== null && (
                <span style={{ color: '#10B981', fontWeight: 700 }}>
                  ✅ {trialDaysRemaining} days remaining in free trial
                </span>
              )}
              {isPro && !isTrial && expiryLabel && (
                <span>Renews {expiryLabel}</span>
              )}
              {!isPro && (
                <span>Upgrade to unlock AI assistant, analytics & custom domain</span>
              )}
            </div>
          </div>
        </div>
        {!isPro && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => openPaywall('AI_INVOICE')}
            style={{
              padding: '10px 18px', borderRadius: 99, border: 'none', flexShrink: 0,
              background: 'linear-gradient(135deg, #D4A050, #F5D78E)',
              color: '#0E0C0B', fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(212,160,80,0.35)',
            }}
          >
            Upgrade Now
          </motion.button>
        )}
      </div>

      {/* Restore purchases */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={handleRestore}
          disabled={restoring}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none',
            color: 'var(--text3)', fontSize: 12.5, fontWeight: 600,
            cursor: restoring ? 'default' : 'pointer', padding: 0,
          }}
        >
          <RefreshCw size={13} style={{ animation: restoring ? 'spin 1s linear infinite' : 'none' }} />
          {restoring ? 'Restoring…' : 'Restore Purchases'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
          Subscription via Google Play
        </span>
      </div>
    </motion.div>
  );
}


export default function Settings() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t, i18n } = useTranslation();
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'light');
  const [appLang, setAppLang] = useState(() => localStorage.getItem('cc_appLang') || 'en');
  const [uiSounds, setUiSounds] = useState(() => localStorage.getItem('uiSounds') !== 'off');
  const [dashboardTheme, setDashboardTheme] = useState(() => localStorage.getItem('dashboardTheme') || 'classic');
  const [bakeryTheme, setBakeryTheme] = useState(() => localStorage.getItem('bakeryTheme') || 'cream-rose');

  const applyBakeryTheme = (themeName) => {
    setBakeryTheme(themeName);
    localStorage.setItem('bakeryTheme', themeName);
    if (themeName === 'cream-rose') {
      document.documentElement.removeAttribute('data-bakery-theme');
    } else {
      document.documentElement.setAttribute('data-bakery-theme', themeName);
    }
    showToast(`Bakery theme updated`, 'success');
    triggerHaptic('medium');
  };
  const [notifs, setNotifs] = useState(DEFAULT_PREFERENCES);
  const [clearing, setClearing] = useState(false);
  const [menuPublished, setMenuPublished] = useState(false);
  const [menuUrl, setMenuUrl] = useState('');
  const [canInstall, setCanInstall] = useState(false);
  const installPromptRef = React.useRef(null);

  // ── Load Notification Preferences ──
  useEffect(() => {
    (async () => {
      const prefs = await loadNotificationPreferences(currentUser?.uid);
      setNotifs(prefs);
    })();
  }, [currentUser]);

  const handleToggleNotifKey = async (key) => {
    const updated = { [key]: !notifs[key] };
    setNotifs((prev) => ({ ...prev, ...updated }));
    await updateNotificationPreferences(currentUser?.uid, updated);
    showToast('Notification settings saved', 'success');
  };

  // Keep local theme in sync with the global theme broadcast
  useEffect(() => {
    const onChanged = (e) => {
      if (e?.detail) setThemeState(e.detail);
    };
    window.addEventListener('cc-theme-changed', onChanged);
    return () => window.removeEventListener('cc-theme-changed', onChanged);
  }, []);

  // Load notification prefs + menu status from the user doc
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      try {
        const uDoc = await getUserDoc(currentUser.uid);
        if (uDoc && uDoc.notifications) {
          setNotifs({ email: true, orders: true, whatsapp: false, ...uDoc.notifications });
        }
        // Check if menu is published
        const biz = await getBusinessByUserId(currentUser.uid);
        if (biz && biz.username) {
          const menu = await getMenuSettingsByUserId(currentUser.uid);
          if (menu && menu.published) {
            setMenuPublished(true);
            setMenuUrl(`${window.location.origin}/menu/${biz.username}`);
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [currentUser]);

  // Capture the PWA install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      installPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const setTheme = (next) => {
    triggerHaptic('light');
    setThemeState(next);
    window.dispatchEvent(new CustomEvent('cc-set-theme', { detail: next }));
  };

  const changeLanguage = (code) => {
    triggerHaptic('light');
    setAppLang(code);
    localStorage.setItem('cc_appLang', code);
    i18n.changeLanguage(code);
    document.documentElement.lang = code;
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    showToast(
      t('toast.languageChanged', { lang: LANGUAGES.find((l) => l.code === code)?.label || code }),
      'success'
    );
  };

  const toggleUiSounds = () => {
    const next = !uiSounds;
    setUiSounds(next);
    localStorage.setItem('uiSounds', next ? 'on' : 'off');
    if (next) triggerHaptic('success');
  };

  const handleDashboardThemeChange = (val) => {
    setDashboardTheme(val);
    localStorage.setItem('dashboardTheme', val);
    window.dispatchEvent(new Event('dashboardThemeChanged'));
    triggerHaptic('medium');
  };

  const clearCache = async () => {
    setClearing(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      showToast('Cache cleared — reloading…', 'success');
      setTimeout(() => window.location.reload(), 900);
    } catch {
      showToast('Could not clear cache', 'error');
      setClearing(false);
    }
  };

  const installApp = async () => {
    const prompt = installPromptRef.current;
    if (!prompt) {
      showToast('App is already installed or not available here', 'info');
      return;
    }
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') showToast('Installing Cream & Crust 🧁', 'success');
    installPromptRef.current = null;
    setCanInstall(false);
  };

  const THEME_OPTIONS = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div className="fade-in" style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 48 }}>
      {/* ── Elevated Header Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          padding: '16px 20px',
          borderRadius: 20,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            {t('settings.title')}
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text3)' }}>
            {t('settings.subtitle')}
          </p>
        </div>
        <div
          style={{
            padding: '6px 14px',
            borderRadius: 99,
            background: 'var(--accent-lt)',
            color: 'var(--accent)',
            fontSize: 12,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Sparkles size={14} />
          <span>Atelier Edition</span>
        </div>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* ── Subscription Banner ── */}
        <PremiumStatusWidget navigate={navigate} />

        {/* ── Quick Action Row (Profile + Website) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {/* Profile Shortcut */}
          <motion.button
            whileHover={{ y: -2, scale: 1.005 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '18px 20px',
              borderRadius: 20,
              border: '1px solid var(--border)',
              background: 'linear-gradient(135deg, rgba(181,96,106,0.08) 0%, rgba(244,221,214,0.12) 100%)',
              boxShadow: 'var(--shadow-xs)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(181,96,106,0.3)',
              }}
            >
              <UserIcon size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                Profile & Business
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>
                Bakery identity, payments & security
              </div>
            </div>
            <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
          </motion.button>

          {/* Website Link Card */}
          <motion.button
            whileHover={{ y: -2, scale: 1.005 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              if (menuPublished) {
                try {
                  const { openLink } = await import('../utils/openLink');
                  await openLink(menuUrl);
                } catch {
                  window.open(menuUrl, '_blank');
                }
              } else {
                navigate('/menu-builder');
                showToast('Create and publish your menu first', 'info');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '18px 20px',
              borderRadius: 20,
              border: menuPublished ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border)',
              background: menuPublished
                ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(52,211,153,0.04) 100%)'
                : 'var(--card)',
              boxShadow: 'var(--shadow-xs)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                flexShrink: 0,
                background: menuPublished ? 'linear-gradient(135deg, #10B981, #34D399)' : 'var(--bg2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: menuPublished ? '#fff' : 'var(--text3)',
                boxShadow: menuPublished ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
              }}
            >
              {menuPublished ? <ExternalLink size={20} /> : <Lock size={18} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                {menuPublished ? 'Live Website' : 'Your Website'}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--text3)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {menuPublished ? menuUrl : 'Publish menu to activate store link'}
              </div>
            </div>
            <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
          </motion.button>
        </div>

        {/* ── Appearance Section ── */}
        <Section
          icon={Palette}
          iconBg="rgba(124,58,237,0.12)"
          iconColor="#7C3AED"
          title={t('settings.appearance')}
          description={t('settings.appearanceDesc')}
        >
          {/* Light / Dark Mode Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.key;
              return (
                <motion.button
                  key={opt.key}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setTheme(opt.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '16px 14px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    background: active ? 'var(--accent-lt)' : 'var(--bg)',
                    border: active ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                    color: active ? 'var(--accent)' : 'var(--text2)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <opt.icon size={20} />
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{opt.label} Mode</span>
                </motion.button>
              );
            })}
          </div>

          {/* Dashboard Theme Option */}
          <Row>
            <LayoutGrid size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Dashboard Layout</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Choose default home screen mode</div>
            </div>
            <div style={{ display: 'flex', gap: 6, background: 'var(--bg2)', padding: 4, borderRadius: 12 }}>
              {['classic', 'modern'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleDashboardThemeChange(t)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 9,
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: 'capitalize',
                    border: 'none',
                    background: dashboardTheme === t ? 'var(--accent)' : 'transparent',
                    color: dashboardTheme === t ? '#fff' : 'var(--text2)',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </Row>

          {/* Bakery Theme Presets */}
          <Row>
            <Sparkles size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Bakery Color Theme</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Signature atelier color palette</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'cream-rose', label: '🌹 Rose', color: '#B5606A' },
                { id: 'golden-honey', label: '🍯 Honey', color: '#D97706' },
                { id: 'matcha-mint', label: '🍵 Matcha', color: '#059669' },
                { id: 'dark-espresso', label: '☕ Espresso', color: '#D8B97E' },
              ].map((t) => {
                const isActive = bakeryTheme === t.id || (t.id === 'cream-rose' && !bakeryTheme);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyBakeryTheme(t.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 10,
                      fontSize: 11.5,
                      fontWeight: 800,
                      border: isActive ? `2px solid ${t.color}` : '1.5px solid var(--border)',
                      background: isActive ? t.color : 'var(--bg2)',
                      color: isActive ? '#fff' : 'var(--text2)',
                      cursor: 'pointer',
                      boxShadow: isActive ? `0 3px 10px ${t.color}40` : 'none',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Row>

          {/* UI Sounds */}
          <Row last>
            <BellRing size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>UI Sound Effects</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Play subtle audio feedback on tap & success</div>
            </div>
            <Toggle on={uiSounds} onToggle={toggleUiSounds} />
          </Row>
        </Section>

        {/* ── Language Section ── */}
        <Section
          icon={Globe}
          iconBg="rgba(59, 130, 246, 0.12)"
          iconColor="#3B82F6"
          title={t('settings.language')}
          description={t('settings.languageDesc')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {LANGUAGES.map((lang) => {
              const active = appLang === lang.code;
              return (
                <motion.button
                  key={lang.code}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => changeLanguage(lang.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    background: active ? 'var(--accent-lt)' : 'var(--bg)',
                    border: active ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                    color: active ? 'var(--accent)' : 'var(--text2)',
                    transition: 'all 0.18s ease',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{lang.flag}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: active ? 'var(--text)' : 'var(--text2)' }}>
                      {lang.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                      {lang.native}
                    </div>
                  </div>
                  {active && (
                    <Check size={16} color="var(--accent)" strokeWidth={3} style={{ flexShrink: 0 }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </Section>

        {/* ── Notification Preferences Section ── */}
        <Section
          icon={Bell}
          iconBg="rgba(168,216,200,0.25)"
          iconColor="#4A9A80"
          title="Notification Preferences"
          description="Manage push alerts, live order tracking, low inventory & quiet hours"
        >
          <div>
            {[
              { key: 'orders', label: 'New Orders Alert', desc: 'Instant push alert when customer places an order' },
              { key: 'orderStatus', label: 'Live Order Progress', desc: 'Real-time updates as order transitions through baking & delivery' },
              { key: 'lowInventory', label: 'Low Stock Warnings', desc: 'Alerts when ingredients drop below minimum threshold' },
              { key: 'aiUpdates', label: 'AI Insights & Tips', desc: 'Smart sales suggestions and automated recipe recommendations' },
              { key: 'marketing', label: 'Growth Strategies', desc: 'Promotional updates and bakery expansion guides' },
              { key: 'subscription', label: 'Billing & Subscriptions', desc: 'Renewal reminders and invoices' },
              { key: 'sound', label: 'Push Alert Sound', desc: 'Play custom bakery chime when push arrives' },
              { key: 'vibration', label: 'Tactile Haptics', desc: 'Vibrate device on high-priority notifications' },
              { key: 'quietHoursEnabled', label: 'Quiet Hours (10 PM - 7 AM)', desc: 'Mute non-urgent alerts overnight' },
            ].map((item, i, arr) => (
              <Row key={item.key} last={i === arr.length - 1}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{item.desc}</div>
                </div>
                <Toggle on={!!notifs[item.key]} onToggle={() => handleToggleNotifKey(item.key)} />
              </Row>
            ))}
          </div>
        </Section>

        {/* ── Layout Shortcuts Section ── */}
        <Section
          icon={SlidersHorizontal}
          iconBg="rgba(234,130,60,0.12)"
          iconColor="#EA823C"
          title="Navigation & Shortcuts"
          description="Personalise footer shortcuts and app navigation"
        >
          <Row
            last
            onClick={() => {
              triggerHaptic('light');
              window.dispatchEvent(new CustomEvent('cc-open-bottom-nav-customise'));
            }}
          >
            <Sliders size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                Customize Footer Navigation
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
                Select your 4 primary quick-access module shortcuts
              </div>
            </div>
            <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
          </Row>
        </Section>

        {/* ── WhatsApp-Style Chat & Data Backup Section ── */}
        <BackupSettingsScreen />

        {/* ── Device & Data Section ── */}
        <Section
          icon={HardDrive}
          iconBg="rgba(2,132,199,0.12)"
          iconColor="#0284C7"
          title="Device & System Care"
          description="Install app locally, clear offline cache and replay walkthroughs"
        >
          {canInstall && (
            <Row onClick={installApp}>
              <Download size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  Install App on Device
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
                  Add Cream & Crust to home screen for offline support
                </div>
              </div>
              <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
            </Row>
          )}
          <Row onClick={clearing ? undefined : clearCache}>
            <RefreshCw
              size={18}
              color="var(--text3)"
              style={{ flexShrink: 0, animation: clearing ? 'spin 1s linear infinite' : 'none' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {clearing ? 'Clearing Storage…' : 'Clear Cache & Refresh'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
                Fixes stale data and forces fetching the latest version
              </div>
            </div>
            <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
          </Row>
          <Row
            last
            onClick={() => {
              triggerHaptic('light');
              resetAllModuleTours(currentUser?.uid);
              resetAllDemos(currentUser?.uid);
              showToast('Walkthrough tours reset — open any module to replay', 'success');
            }}
          >
            <Sparkles size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                Replay App Tours
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
                Reset guided feature tours across all modules
              </div>
            </div>
            <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
          </Row>
        </Section>

        {/* ── About & Legal Section ── */}
        <Section
          icon={Info}
          iconBg="rgba(140,122,107,0.14)"
          iconColor="var(--text2)"
          title={t('settings.about')}
          description={t('settings.aboutDesc')}
        >
          <Row>
            <ShieldCheck size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>App Version</div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text2)', background: 'var(--bg2)', padding: '4px 10px', borderRadius: 99 }}>
              v{APP_VERSION}
            </span>
          </Row>
          <Row onClick={() => navigate('/privacy')}>
            <FileText size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                Privacy Policy
              </div>
            </div>
            <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
          </Row>
          <Row last onClick={() => navigate('/terms')}>
            <FileText size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                Terms of Service
              </div>
            </div>
            <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
          </Row>
        </Section>

        {/* ── Brand Signature Footer ── */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--text3)',
            padding: '16px 0 8px',
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--accent)',
            }}
          >
            Cream &amp; Crust
          </div>
          Bakery Business OS · Version {APP_VERSION}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
