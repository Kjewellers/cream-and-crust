import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image as ImageIcon, Bell, Mic, FileText, Settings, X, ShieldAlert, MapPin } from 'lucide-react';
import { PermissionManager, PERMISSION_TYPES } from '../services/PermissionManager';
import Platform from '../platform/Platform';

const PermissionContext = createContext();

export const usePermissions = () => useContext(PermissionContext);

export let globalRequirePermission = async () => true;

const UI_CONTENT = {
  [PERMISSION_TYPES.CAMERA]: {
    title: '📸 Camera Access',
    message: 'Take beautiful product photos, scan QR codes, and capture your bakery logo directly inside Cream & Crust.',
    icon: Camera,
    continueText: 'Allow Camera',
    deniedMessage: 'Camera permission is disabled. Enable it from Settings to capture photos.',
  },
  [PERMISSION_TYPES.GALLERY]: {
    title: '🖼 Photo Library',
    message: 'Pick photos from your gallery to upload products, cakes and menu images.',
    icon: ImageIcon,
    continueText: 'Open Gallery',
    deniedMessage: 'Photo access is disabled. Enable it from Settings to pick images.',
  },
  [PERMISSION_TYPES.NOTIFICATIONS]: {
    title: '🔔 Enable Notifications',
    message: 'Receive order updates, AI alerts, subscription expiry reminders and payment confirmations.',
    icon: Bell,
    continueText: 'Enable Notifications',
    deniedMessage: 'Notifications are disabled. Enable them from Settings to stay updated.',
  },
  [PERMISSION_TYPES.MICROPHONE]: {
    title: '🎤 AI Voice',
    message: 'Use your voice to control Cream AI — create orders, check stock and get bakery insights hands-free.',
    icon: Mic,
    continueText: 'Allow Microphone',
    deniedMessage: 'Microphone permission is disabled. Enable it from Settings to use voice commands.',
  },
  [PERMISSION_TYPES.LOCATION]: {
    title: '📍 Your Location',
    message: 'Used to set your delivery radius and show your bakery location to nearby customers.',
    icon: MapPin,
    continueText: 'Allow Location',
    deniedMessage: 'Location permission is disabled. Enable it from Settings to use delivery features.',
  },
  [PERMISSION_TYPES.FILE_ACCESS]: {
    title: '📄 File Access',
    message: 'Required for generating invoices, sharing PDFs and saving order cards.',
    icon: FileText,
    continueText: 'Allow Access',
    deniedMessage: 'File access is disabled. Enable it from Settings to export invoices.',
  },
};

export const PermissionProvider = ({ children }) => {
  const [activeRequest, setActiveRequest] = useState(null); // { type, resolve, reject, isDenied }

  const requirePermission = useCallback(async (type) => {
    if (!Platform.isAndroid()) return true;

    // Guard: unknown or undefined permission type — grant silently to prevent crashes
    if (!type || !UI_CONTENT[type]) {
      console.warn('[PermissionContext] Unknown permission type:', type, '— granting by default');
      return true;
    }

    // 1. Check current status
    const status = await PermissionManager.checkPermission(type);
    
    // If already granted, proceed silently
    if (status === 'granted') return true;

    // 2. If denied previously, or prompt needed, show our Premium UI
    return new Promise((resolve) => {
      setActiveRequest({
        type,
        resolve,
        isDenied: status === 'denied', // If strictly 'denied', it might be permanently denied on some OS
      });
    });
  }, []);

  React.useEffect(() => {
    globalRequirePermission = requirePermission;
  }, [requirePermission]);

  const handleContinue = async () => {
    if (!activeRequest) return;
    const { type, resolve } = activeRequest;
    
    // 3. Trigger native OS popup
    const newStatus = await PermissionManager.requestPermission(type);
    
    if (newStatus === 'granted') {
      setActiveRequest(null);
      resolve(true);
    } else {
      // 4. Handle denied
      setActiveRequest({ type, resolve, isDenied: true });
    }
  };

  const handleNotNow = () => {
    if (!activeRequest) return;
    activeRequest.resolve(false);
    setActiveRequest(null);
  };

  const handleOpenSettings = async () => {
    await PermissionManager.openSettings();
    if (activeRequest) {
      activeRequest.resolve(false);
      setActiveRequest(null);
    }
  };

  return (
    <PermissionContext.Provider value={{ requirePermission }}>
      {children}

      <AnimatePresence>
        {activeRequest && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
              onClick={handleNotNow}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                background: 'var(--card, #fff)',
                borderRadius: 24,
                width: '100%',
                maxWidth: 340,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Banner Area */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(181, 96, 106, 0.1), rgba(181, 96, 106, 0.02))',
                padding: '32px 24px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.05))'
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: 'var(--card, #fff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
                  marginBottom: 20,
                  color: 'var(--accent, #B5606A)'
                }}>
                  {activeRequest.isDenied ? <ShieldAlert size={32} /> : (
                    (() => {
                      const Icon = UI_CONTENT[activeRequest.type].icon;
                      return <Icon size={32} strokeWidth={1.5} />;
                    })()
                  )}
                </div>

                <h3 style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--text, #1C1917)',
                  marginBottom: 8
                }}>
                  {activeRequest.isDenied ? 'Permission Required' : UI_CONTENT[activeRequest.type].title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: 'var(--text2, #57534E)',
                  lineHeight: 1.5
                }}>
                  {activeRequest.isDenied
                    ? (UI_CONTENT[activeRequest.type]?.deniedMessage ?? 'This permission is disabled. Enable it from Settings to continue.')
                    : UI_CONTENT[activeRequest.type].message}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeRequest.isDenied ? (
                  <>
                    <button
                      onClick={handleOpenSettings}
                      style={{
                        background: 'var(--text, #1C1917)',
                        color: 'var(--card, #fff)',
                        border: 'none',
                        padding: '14px 20px',
                        borderRadius: 14,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        width: '100%'
                      }}
                    >
                      <Settings size={18} /> Open Settings
                    </button>
                    <button
                      onClick={handleNotNow}
                      style={{
                        background: 'var(--bg, #f5f5f5)',
                        color: 'var(--text2, #57534E)',
                        border: 'none',
                        padding: '14px 20px',
                        borderRadius: 14,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleContinue}
                      style={{
                        background: 'var(--accent, #B5606A)',
                        color: '#fff',
                        border: 'none',
                        padding: '14px 20px',
                        borderRadius: 14,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      {UI_CONTENT[activeRequest.type]?.continueText ?? 'Continue'}
                    </button>
                    <button
                      onClick={handleNotNow}
                      style={{
                        background: 'transparent',
                        color: 'var(--text3, #A8A29E)',
                        border: 'none',
                        padding: '12px 20px',
                        borderRadius: 14,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      Not Now
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PermissionContext.Provider>
  );
};
