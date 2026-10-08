import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

import SystemGuard from './components/SystemGuard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Loader2 } from './components/iOS';
import { ErrorPresenter } from './components/system/ErrorPresenter';
import { AmbientCanvas, MotionDebugger } from './motion';
import { ConfettiCanvas, SuccessBurstOverlay, FloatingRewardLayer } from './components/DopamineKit';
import PremiumAppTour from './components/PremiumAppTour';
import AppErrorBoundary from './components/AppErrorBoundary';
import CommandPalette from './components/CommandPalette';
import { PermissionProvider } from './context/PermissionContext';
import { MotionProvider, MotionDebugPanel } from './motion';
import PwaUpdateToast from './components/PwaUpdateToast';
import OfflineBanner from './components/OfflineBanner';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useAppRetention } from './hooks/useAppRetention';
import { useAnalyticsAndCrashlytics } from './hooks/useAnalyticsAndCrashlytics';
import { useLowStockAlert } from './hooks/useLowStockAlert';

// ── Premium Gating System ──────────────────────────────────────────────────
import { SubscriptionProvider, useSubscriptionContext } from './context/SubscriptionContext';
import { OverlayProvider, useOverlay } from './context/OverlayContext';
import PremiumPaywall from './components/premium/PremiumPaywall';
import PremiumPreviewScreen from './components/premium/PremiumPreviewScreen';
import UnlockCelebration from './components/premium/UnlockCelebration';
import SubscriptionErrorBoundary from './components/premium/SubscriptionErrorBoundary';
import LiveStatusIsland from './components/system/LiveStatusIsland';
import CreamCrustLiveBanner from './components/notifications/CreamCrustLiveBanner';
import NotificationCenterModal from './components/notifications/NotificationCenterModal';

// ── Navigation, Routing & Startup Components ──────────────────────────────
import NavigationMenu from './components/navigation/NavigationMenu';
import MobileHeader from './components/navigation/MobileHeader';
import BottomNav from './components/navigation/BottomNav';
import SplashScreen from './components/startup/SplashScreen';
import AnimatedRoutes from './components/routing/AnimatedRoutes';
import { PageWrapper, DelayedFallback } from './components/routing/PageWrapper';

// ── Core Infrastructure ────────────────────────────────────────────────────
import { EventBus, EVENTS } from './core/eventBus/index.js';
import { useTheme } from './core/theme/ThemeService.js';
import './index.css';

// Lazy-loaded standalone screens
const Login = lazy(() => import('./pages/Login'));
const OnboardingModal = lazy(() => import('./components/OnboardingModal'));
const RestoreWizard = lazy(() => import('./components/backup/RestoreWizard'));
const AICompanion = lazy(() => import('./pages/AICompanion'));
const PublishedMenu = lazy(() => import('./pages/menu/PublishedMenu'));
const PublicOrderForm = lazy(() => import('./pages/PublicOrderForm'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'));

function MainLayout() {
  const { openDrawer, closeOverlay, overlays } = useOverlay();
  const isDrawerOpen = overlays.some((o) => o.type === 'drawer');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  const handleTouchStart = (e) => setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  const handleTouchMove = (e) => {
    if (!touchStart) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStart.x - currentX;
    const diffY = touchStart.y - currentY;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 50 && isDrawerOpen) {
        // Find drawer and close it
        const drawer = overlays.find((o) => o.type === 'drawer');
        if (drawer) closeOverlay(drawer.id);
        setTouchStart(null);
      } else if (diffX < -50 && !isDrawerOpen && touchStart.x < 40) {
        openDrawer({
          id: 'main-nav',
          content: <NavigationMenu onClose={() => closeOverlay('main-nav')} theme={theme} toggleTheme={toggleTheme} />,
        });
        setTouchStart(null);
      }
    }
  };
  const handleTouchEnd = () => setTouchStart(null);

  // Theme managed by ThemeService
  const { theme, toggle: toggleTheme } = useTheme();

  // Sync mobile status bar color on theme change
  useEffect(() => {
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = theme === 'dark' ? '#121212' : '#FDFBF7';
  }, [theme]);

  // Push notifications, retention, analytics & crashlytics
  usePushNotifications();
  useAppRetention();
  useAnalyticsAndCrashlytics();

  // Isolated low-stock alert monitoring
  useLowStockAlert();

  // Splash screen timing
  useEffect(() => {
    const minTimer = setTimeout(() => {
      setMinSplashTimeElapsed(true);
    }, 1200);
    const hardTimer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(hardTimer);
    };
  }, []);

  // EventBus listeners
  useEffect(() => {
    const unsub = EventBus.on(EVENTS.TRIGGER_HAPTIC, (intensity) => {
      try {
        window.dispatchEvent(new CustomEvent('trigger-haptic', { detail: intensity }));
      } catch {}
    });
    return unsub;
  }, []);

  const {
    currentUser,
    onboardingCompleted,
    business,
    userDetails,
    hasSeenTourV1,
    loading: authLoading,
  } = useAuth();

  const { inventory } = useData();

  useEffect(() => {
    if (minSplashTimeElapsed && !authLoading) {
      setShowSplash(false);
    }
  }, [minSplashTimeElapsed, authLoading]);

  // OTA Health Guard
  useEffect(() => {
    if (!showSplash && currentUser !== undefined && inventory !== undefined) {
      const markHealthy = async () => {
        try {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.set({ key: 'cc_ota_crashes', value: '0' });
          await CapacitorUpdater.notifyAppReady();
        } catch (e) {}
      };
      markHealthy();
    }
  }, [showSplash, currentUser, inventory]);

  const [localHasSeenTour, setLocalHasSeenTour] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showRestoreWizard, setShowRestoreWizard] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const key = `cc_tour_v1_seen_${currentUser.uid}`;
      setLocalHasSeenTour(localStorage.getItem(key) === 'true');
      
      const restoreKey = `cc_vault_restore_checked_${currentUser.uid}`;
      if (!localStorage.getItem(restoreKey)) {
        setShowRestoreWizard(true);
      }
      
      import('./services/backup').then(m => m.initScheduler());
    } else {
      setLocalHasSeenTour(false);
      setShowTutorial(false);
      setShowRestoreWizard(false);
      
      import('./services/backup').then(m => m.destroyScheduler());
    }
  }, [currentUser]);

  const handleTourComplete = () => {
    if (currentUser) {
      localStorage.setItem(`cc_tour_v1_seen_${currentUser.uid}`, 'true');
      setLocalHasSeenTour(true);
    }
  };

  const handleRestoreWizardComplete = () => {
    if (currentUser) {
      localStorage.setItem(`cc_vault_restore_checked_${currentUser.uid}`, 'true');
    }
    setShowRestoreWizard(false);
  };

  const location = useLocation();

  const isPublicRoute =
    location.pathname.startsWith('/order/') ||
    location.pathname.startsWith('/menu/') ||
    location.pathname.startsWith('/privacy') ||
    location.pathname.startsWith('/terms') ||
    location.pathname.startsWith('/legal');

  const content = isPublicRoute ? (
    <motion.div
      key="public"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Suspense fallback={<DelayedFallback fullScreen />}>
        <Routes>
          <Route path="/order/:username" element={<PublicOrderForm />} />
          <Route path="/menu/:username" element={<PublishedMenu />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/privacy.html" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/terms.html" element={<TermsOfService />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
          <Route path="/legal/terms" element={<TermsOfService />} />
        </Routes>
      </Suspense>
    </motion.div>
  ) : !currentUser && !authLoading ? (
    <motion.div
      key="login"
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      style={{ height: '100vh', width: '100vw' }}
    >
      <Suspense fallback={<DelayedFallback fullScreen />}>
        <Login />
      </Suspense>
    </motion.div>
  ) : currentUser ? (
    <motion.div
      key="app"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="app"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <LiveStatusIsland />
      <MobileHeader
        onMenuClick={() =>
          openDrawer({
            id: 'main-nav',
            content: <NavigationMenu onClose={() => closeOverlay('main-nav')} theme={theme} toggleTheme={toggleTheme} />,
          })
        }
        onNotificationClick={() => setNotificationCenterOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <NotificationCenterModal
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />
      <main className="main">
        <AppErrorBoundary uid={currentUser?.uid ?? null}>
          <Suspense fallback={<DelayedFallback />}>
            <AnimatedRoutes />
          </Suspense>
        </AppErrorBoundary>
      </main>
      <BottomNav />
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      {currentUser && (
        <Suspense fallback={null}>
          <AICompanion />
        </Suspense>
      )}
      {currentUser && !localHasSeenTour && !hasSeenTourV1 && onboardingCompleted && !showRestoreWizard && (
        <PremiumAppTour onComplete={handleTourComplete} />
      )}
      {currentUser && !onboardingCompleted && !showTutorial && !showRestoreWizard && (
        <Suspense fallback={null}>
          <OnboardingModal
            user={{ ...currentUser, ...userDetails }}
            business={business}
            onComplete={() => setShowTutorial(true)}
          />
        </Suspense>
      )}
      {currentUser && !onboardingCompleted && showTutorial && !localHasSeenTour && !showRestoreWizard && (
        <PremiumAppTour onComplete={handleTourComplete} />
      )}
      {currentUser && showRestoreWizard && (
        <Suspense fallback={null}>
          <RestoreWizard 
            onComplete={handleRestoreWizardComplete} 
            onSkip={handleRestoreWizardComplete} 
          />
        </Suspense>
      )}
    </motion.div>
  ) : (
    <div
      key="loading"
      style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Loader2 className="animate-spin" color="var(--accent)" />
    </div>
  );

  return (
    <>
      <AnimatePresence>{showSplash && <SplashScreen key="splash" />}</AnimatePresence>
      <SystemGuard>
        <AnimatePresence mode="wait">{content}</AnimatePresence>
      </SystemGuard>
    </>
  );
}

function PremiumOverlays() {
  const { unlockCelebrationVisible, paywallFeatureKey } = useSubscriptionContext();
  return (
    <SubscriptionErrorBoundary>
      <PremiumPreviewScreen />
      <PremiumPaywall />
      <UnlockCelebration
        visible={unlockCelebrationVisible}
        featureLabel={paywallFeatureKey}
      />
    </SubscriptionErrorBoundary>
  );
}

export default function App() {
  return (
    <OverlayProvider>
      <HashRouter>
        <MotionProvider>
          <PermissionProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <DataProvider>
                  <AmbientCanvas />
                  <MainLayout />
                  <ErrorPresenter />
                  <OfflineBanner />
                  <CreamCrustLiveBanner />
                  <ConfettiCanvas />
                  <SuccessBurstOverlay />
                  <FloatingRewardLayer />
                  <PwaUpdateToast />
                  <MotionDebugPanel />
                  <MotionDebugger />
                  <PremiumOverlays />
                </DataProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </PermissionProvider>
        </MotionProvider>
      </HashRouter>
    </OverlayProvider>
  );
}
