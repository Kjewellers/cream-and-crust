import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import RouteErrorBoundary from '../RouteErrorBoundary';
import { PageWrapper, DelayedFallback } from './PageWrapper';

// Lazy-loaded pages
const Dashboard = lazy(() => import('../../pages/Dashboard'));
const Orders = lazy(() => import('../../pages/Orders'));
const Calendar = lazy(() => import('../../pages/Calendar'));
const Products = lazy(() => import('../../pages/Products'));
const Customers = lazy(() => import('../../pages/Customers'));
const Inventory = lazy(() => import('../../pages/Inventory'));
const Recipes = lazy(() => import('../../pages/Recipes'));
const Analytics = lazy(() => import('../../pages/Analytics'));
const Expenses = lazy(() => import('../../pages/Expenses'));
const ShoppingList = lazy(() => import('../../pages/ShoppingList'));
const RecycleBin = lazy(() => import('../../pages/RecycleBin'));
const Profile = lazy(() => import('../../pages/Profile'));
const SettingsPage = lazy(() => import('../../pages/Settings'));
const MenuDashboard = lazy(() => import('../../pages/menu/MenuDashboard'));
const MenuAnalytics = lazy(() => import('../../pages/menu/MenuAnalytics'));
const DebugAnalytics = lazy(() => import('../../pages/menu/DebugAnalytics'));
const CreateMenu = lazy(() => import('../../pages/menu/CreateMenu'));
const MenuCategories = lazy(() => import('../../pages/menu/MenuCategories'));
const MenuProducts = lazy(() => import('../../pages/menu/MenuProducts'));
const MenuThemeCustomizer = lazy(() => import('../../pages/menu/MenuThemeCustomizer'));
const MenuLivePreview = lazy(() => import('../../pages/menu/MenuLivePreview'));
const PublishedMenu = lazy(() => import('../../pages/menu/PublishedMenu'));
const PublicOrderForm = lazy(() => import('../../pages/PublicOrderForm'));
const PrivacyPolicy = lazy(() => import('../../pages/legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('../../pages/legal/TermsOfService'));
const SetupAdmin = lazy(() => import('../../pages/SetupAdmin'));
const SuperAdmin = lazy(() => import('../../pages/SuperAdmin'));
const Subscribe = lazy(() => import('../../pages/Subscription'));
const AIAssistantHub = lazy(() => import('../../pages/AIAssistantHub'));
const SubscriptionGate = lazy(() => import('../SubscriptionGate'));

export default function AnimatedRoutes() {
  const location = useLocation();
  const { isAdmin, userRole } = useAuth();
  const isBaker = userRole === 'baker';

  const renderRoute = (path, element) => (
    <Route
      path={path}
      element={
        <RouteErrorBoundary>
          <Suspense fallback={<DelayedFallback />}>
            <PageWrapper>{element}</PageWrapper>
          </Suspense>
        </RouteErrorBoundary>
      }
    />
  );

  const renderPremiumRoute = (path, element) => (
    <Route
      path={path}
      element={
        <RouteErrorBoundary>
          <Suspense fallback={<DelayedFallback />}>
            <PageWrapper>
              <Suspense fallback={null}>
                <SubscriptionGate>{element}</SubscriptionGate>
              </Suspense>
            </PageWrapper>
          </Suspense>
        </RouteErrorBoundary>
      }
    />
  );

  return (
    <AnimatePresence>
      <Routes location={location} key={location.pathname}>
        {isAdmin || isBaker ? (
          <>
            {renderRoute('/', <Dashboard />)}
            {renderPremiumRoute('/ai-assistant', <AIAssistantHub />)}
            {renderRoute('/orders', <Orders />)}
            {renderRoute('/calendar', <Calendar />)}
            {renderRoute('/products', <Products />)}
            {renderRoute('/customers', <Customers />)}
            {renderRoute('/inventory', <Inventory />)}
            {renderRoute('/recipes', <Recipes />)}
            {renderPremiumRoute('/analytics', <Analytics />)}
            {renderRoute('/expenses', <Expenses />)}
            {renderRoute('/shopping-list', <ShoppingList />)}
            {renderRoute('/recycle-bin', <RecycleBin />)}
            {renderRoute('/profile', <Profile />)}
            {renderRoute('/settings', <SettingsPage />)}
            {renderPremiumRoute('/menu-builder', <MenuDashboard />)}
            {renderPremiumRoute('/menu-builder/analytics', <MenuAnalytics />)}
            {renderRoute('/debug-analytics', <DebugAnalytics />)}
            {renderPremiumRoute('/menu-builder/create', <CreateMenu />)}
            {renderPremiumRoute('/menu-builder/categories', <MenuCategories />)}
            {renderPremiumRoute('/menu-builder/products', <MenuProducts />)}
            {renderPremiumRoute('/menu-builder/theme', <MenuThemeCustomizer />)}
            {renderPremiumRoute('/menu-builder/preview', <MenuLivePreview />)}
            {renderRoute('/super-admin', <SuperAdmin />)}
            {renderRoute('/subscribe', <Subscribe />)}
          </>
        ) : (
          <>
            {renderRoute('/', <Products />)}
            {renderRoute('/orders', <Orders />)}
            {renderRoute('/profile', <Profile />)}
            {renderRoute('/settings', <SettingsPage />)}
          </>
        )}
        {renderRoute('/menu/:username', <PublishedMenu />)}
        {renderRoute('/order/:username', <PublicOrderForm />)}
        {renderRoute('/privacy', <PrivacyPolicy />)}
        {renderRoute('/terms', <TermsOfService />)}
        {renderRoute('/setup-admin', <SetupAdmin />)}
        <Route
          path="*"
          element={
            <div style={{ padding: 40, textAlign: 'center' }}>
              <h2>404 - Page Not Found</h2>
              <button
                className="btn btn-primary"
                onClick={() => (window.location.href = '/')}
                style={{ marginTop: 20 }}
              >
                Go Home
              </button>
            </div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}
