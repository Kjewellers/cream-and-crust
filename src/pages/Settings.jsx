import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { showToast, triggerHaptic } from '../components/iOS';
import { useTranslation } from 'react-i18next';
import { resetAllModuleTours } from '../components/ModuleTour';
import { resetAllDemos } from '../components/AnimatedDemo';
import SubscriptionCard from '../components/SubscriptionCard';

const APP_VERSION = '1.0.0';

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

/* Section card wrapper */
function Section({ icon: Icon, iconBg, iconColor, title, description, children }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: iconBg || 'var(--accent-lt)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor || 'var(--accent)',
            flexShrink: 0,
          }}
        >
          <Icon size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {title}
          </h3>
          {description && (
            <p
              style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.4 }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/* iOS-style toggle */
function Toggle({ on, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      style={{
        width: 46,
        height: 28,
        borderRadius: 99,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? 'var(--accent)' : 'var(--border-md)',
        position: 'relative',
        transition: 'background 0.25s',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          top: 2,
          left: 0,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  );
}

function Row({ children, onClick, last }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {children}
    </div>
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
  const [notifs, setNotifs] = useState({ email: true, orders: true, whatsapp: false });
  const [clearing, setClearing] = useState(false);
  const [menuPublished, setMenuPublished] = useState(false);
  const [menuUrl, setMenuUrl] = useState('');
  const [canInstall, setCanInstall] = useState(false);
  const installPromptRef = React.useRef(null);

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
        const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (uDoc.exists() && uDoc.data().notifications) {
          setNotifs({ email: true, orders: true, whatsapp: false, ...uDoc.data().notifications });
        }
        // Check if menu is published
        const bizDoc = await getDoc(doc(db, 'business', currentUser.uid));
        if (bizDoc.exists()) {
          const biz = bizDoc.data();
          if (biz.username) {
            const menuDoc = await getDoc(doc(db, 'menuSettings', currentUser.uid));
            if (menuDoc.exists() && menuDoc.data().published) {
              setMenuPublished(true);
              setMenuUrl(`${window.location.origin}/menu/${biz.username}`);
            }
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
    // Actually change the app language via i18next
    i18n.changeLanguage(code);
    // Set the HTML lang attribute for accessibility / SEO
    document.documentElement.lang = code;
    // Set direction for RTL languages
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

  const toggleNotif = (key) => {
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next);
    triggerHaptic('light');
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), { notifications: next }).catch(() => {});
    }
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

  const NOTIF_ITEMS = [
    { key: 'email', label: 'Email alerts', desc: 'Order updates by email', icon: Mail },
    {
      key: 'orders',
      label: 'Push notifications',
      desc: 'Real-time browser alerts',
      icon: BellRing,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp updates',
      desc: 'Status nudges on WhatsApp',
      icon: MessageCircle,
    },
  ];

  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 40 }}>
      <div className="page-header">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ── Subscription ── */}
        <SubscriptionCard />

        {/* ── Account shortcut ── */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/profile')}
          whileTap={{ scale: 0.99 }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 18px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background:
              'linear-gradient(135deg, rgba(181,96,106,0.08) 0%, rgba(232,180,187,0.06) 100%)',
            boxShadow: 'var(--shadow-xs)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <UserIcon size={19} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>
              Profile & business
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 1 }}>
              Bakery details, payments, security, account
            </div>
          </div>
          <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
        </motion.button>

        {/* ── Your Website (locked until menu is published) ── */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
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
          whileTap={{ scale: 0.99 }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 18px',
            borderRadius: 'var(--radius)',
            border: menuPublished ? '1px solid rgba(16,185,129,0.25)' : '1px solid var(--border)',
            background: menuPublished
              ? 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(52,211,153,0.03) 100%)'
              : 'var(--bg)',
            boxShadow: 'var(--shadow-xs)',
            cursor: 'pointer',
            textAlign: 'left',
            opacity: menuPublished ? 1 : 0.7,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              flexShrink: 0,
              background: menuPublished ? 'linear-gradient(135deg, #10B981, #34D399)' : 'var(--bg)',
              border: menuPublished ? 'none' : '1.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: menuPublished ? '#fff' : 'var(--text3)',
            }}
          >
            {menuPublished ? <ExternalLink size={19} /> : <Lock size={17} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>
              {menuPublished ? 'Your Website' : 'Your Website (locked)'}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--text3)',
                marginTop: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {menuPublished ? menuUrl : 'Publish your menu to unlock your website link'}
            </div>
          </div>
          <ChevronRight size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
        </motion.button>

        {/* ── Appearance ── */}
        <Section
          icon={theme === 'dark' ? Moon : Sun}
          iconBg="rgba(124,58,237,0.12)"
          iconColor="#7C3AED"
          title={t('settings.appearance')}
          description={t('settings.appearanceDesc')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setTheme(opt.key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    padding: '18px 12px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    background: active ? 'var(--accent-lt)' : 'var(--bg)',
                    border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                    color: active ? 'var(--accent)' : 'var(--text2)',
                    transition: 'all 0.18s',
                  }}
                >
                  <opt.icon size={22} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
          <Row>
            <LayoutGrid size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Dashboard Layout</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Choose your default home screen</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['classic', 'modern'].map((t) => (
                <button
                  key={t}
                  onClick={() => handleDashboardThemeChange(t)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    border: 'none',
                    background: dashboardTheme === t ? 'var(--accent)' : 'var(--bg2)',
                    color: dashboardTheme === t ? 'white' : 'var(--text2)',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </Row>
          <Row last>
            <BellRing size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>UI Sounds</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Play subtle sounds on tap and success</div>
            </div>
            <Toggle on={uiSounds} onToggle={toggleUiSounds} />
          </Row>
        </Section>

        {/* ── Language ── */}
        <Section
          icon={Globe}
          iconBg="rgba(59, 130, 246, 0.12)"
          iconColor="#3B82F6"
          title={t('settings.language')}
          description={t('settings.languageDesc')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {LANGUAGES.map((lang) => {
              const active = appLang === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 14,
                    cursor: 'pointer',
                    background: active ? 'var(--accent-lt)' : 'var(--bg)',
                    border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                    color: active ? 'var(--accent)' : 'var(--text2)',
                    transition: 'all 0.18s',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{lang.flag}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: active ? 'var(--text)' : 'var(--text2)',
                      }}
                    >
                      {lang.label}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text3)', marginTop: 1 }}>
                      {lang.native}
                    </div>
                  </div>
                  {active && (
                    <Check
                      size={14}
                      color="var(--accent)"
                      strokeWidth={3}
                      style={{ flexShrink: 0 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
            {t('settings.moreLanguages')}
          </div>
        </Section>

        {/* ── Notifications ── */}
        <Section
          icon={Bell}
          iconBg="rgba(168,216,200,0.25)"
          iconColor="#4A9A80"
          title={t('settings.notifications')}
          description={t('settings.notificationsDesc')}
        >
          <div>
            {NOTIF_ITEMS.map((item, i) => (
              <Row key={item.key} last={i === NOTIF_ITEMS.length - 1}>
                <item.icon size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{item.desc}</div>
                </div>
                <Toggle on={!!notifs[item.key]} onToggle={() => toggleNotif(item.key)} />
              </Row>
            ))}
          </div>
        </Section>

        {/* ── Layout ── */}
        <Section
          icon={Sliders}
          iconBg="rgba(234,130,60,0.12)"
          iconColor="#EA823C"
          title="Layout"
          description="Personalise your navigation"
        >
          <Row
            last
            onClick={() => {
              triggerHaptic('light');
              window.dispatchEvent(new CustomEvent('cc-open-bottom-nav-customise'));
            }}
          >
            <Sliders size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Footer shortcuts
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Choose the 4 shortcuts in the bottom nav
              </div>
            </div>
            <ChevronRight size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
          </Row>
        </Section>

        {/* ── Device & data ── */}
        <Section
          icon={Monitor}
          iconBg="rgba(2,132,199,0.12)"
          iconColor="#0284C7"
          title="Device & data"
          description="Install and manage local storage"
        >
          {canInstall && (
            <Row onClick={installApp}>
              <Download size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  Install app
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Add Cream & Crust to your home screen
                </div>
              </div>
              <ChevronRight size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
            </Row>
          )}
          <Row onClick={clearing ? undefined : clearCache}>
            <RefreshCw
              size={17}
              color="var(--text3)"
              style={{ flexShrink: 0, animation: clearing ? 'spin 1s linear infinite' : 'none' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {clearing ? 'Clearing…' : 'Clear cache & refresh'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                Fixes stale data and loads the latest version
              </div>
            </div>
            <ChevronRight size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
          </Row>
          <Row
            last
            onClick={() => {
              triggerHaptic('light');
              resetAllModuleTours(currentUser?.uid);
              resetAllDemos(currentUser?.uid);
              showToast('Tours reset — open any module to replay', 'success');
            }}
          >
            <Sparkles size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Replay app tours
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                See the guided walkthroughs again
              </div>
            </div>
            <ChevronRight size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
          </Row>
        </Section>

        {/* ── About ── */}
        <Section
          icon={Info}
          iconBg="rgba(140,122,107,0.14)"
          iconColor="var(--text2)"
          title={t('settings.about')}
          description={t('settings.aboutDesc')}
        >
          <Row>
            <ShieldCheck size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Version</div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)' }}>
              {APP_VERSION}
            </span>
          </Row>
          <Row onClick={() => navigate('/privacy')}>
            <FileText size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Privacy policy
              </div>
            </div>
            <ChevronRight size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
          </Row>
          <Row last onClick={() => navigate('/terms')}>
            <FileText size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Terms of service
              </div>
            </div>
            <ChevronRight size={17} color="var(--text3)" style={{ flexShrink: 0 }} />
          </Row>
        </Section>

        <div
          style={{
            textAlign: 'center',
            fontSize: 11.5,
            color: 'var(--text3)',
            padding: '8px 0 4px',
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--accent)',
            }}
          >
            Cream &amp; Crust
          </div>
          Bakery Business OS · v{APP_VERSION}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
