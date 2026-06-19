import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Camera, FolderDown, Loader2, ShieldCheck } from 'lucide-react';
import {
  checkAllPermissions,
  hasAllRequiredPermissions,
  isNative,
  openAppSettings,
  requestAllRequiredPermissions,
} from '../services/permissions';
import { showToast } from './iOS';

const REQUIRED_PERMISSIONS = [
  {
    key: 'camera',
    label: 'Camera',
    description: 'Capture product, profile, and order reference photos.',
    Icon: Camera,
  },
  {
    key: 'photos',
    label: 'Photos and media',
    description: 'Choose gallery images for products, menus, and invoices.',
    Icon: Camera,
  },
  {
    key: 'storage',
    label: 'File storage',
    description: 'Save and share invoices, reports, and exported files.',
    Icon: FolderDown,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Receive order, inventory, and business alerts.',
    Icon: Bell,
  },
];

function statusLabel(value) {
  if (value === 'granted') return 'Allowed';
  if (value === 'denied') return 'Denied';
  if (value === 'prompt') return 'Needs approval';
  return 'Not checked';
}

export default function AppPermissionGate({ children, uid }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const native = isNative();
  const allGranted = useMemo(() => hasAllRequiredPermissions(status), [status]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!native) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const next = await checkAllPermissions();
      if (active) {
        setStatus(next);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [native, uid]);

  const requestPermissions = async () => {
    setRequesting(true);
    try {
      const next = await requestAllRequiredPermissions();
      setStatus(next);

      if (hasAllRequiredPermissions(next)) {
        showToast('All app permissions enabled.', 'success');
      } else {
        showToast('Please allow all permissions to continue.', 'error');
      }
    } finally {
      setRequesting(false);
      setLoading(false);
    }
  };

  if (!native || allGranted) return children;

  const isBusy = loading || requesting;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(180deg, #FFF9F7 0%, #F7EFEA 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#2D1B14',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#FFFFFF',
          border: '1px solid rgba(74, 59, 50, 0.10)',
          borderRadius: 18,
          boxShadow: '0 20px 48px rgba(74, 59, 50, 0.12)',
          padding: 24,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            background: '#FFF1F2',
            color: '#B5606A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <ShieldCheck size={28} />
        </div>

        <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.15 }}>Allow permissions to continue</h1>
        <p style={{ margin: '10px 0 20px', color: '#7B6A5E', lineHeight: 1.5, fontSize: 14 }}>
          Cream & Crust needs these permissions before opening app services.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {REQUIRED_PERMISSIONS.map(({ key, label, description, Icon }) => {
            const granted = status?.[key] === 'granted';
            return (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(74, 59, 50, 0.07)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: granted ? '#ECFDF5' : '#FFF7ED',
                    color: granted ? '#059669' : '#C2410C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{label}</div>
                  <div style={{ color: '#8C7A6B', fontSize: 12.5, lineHeight: 1.35 }}>
                    {description}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: granted ? '#047857' : '#B45309',
                    background: granted ? '#D1FAE5' : '#FEF3C7',
                    borderRadius: 999,
                    padding: '5px 8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {statusLabel(status?.[key])}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={requestPermissions}
          disabled={isBusy}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 12,
            padding: '14px 16px',
            background: '#B5606A',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: isBusy ? 0.7 : 1,
          }}
        >
          {isBusy ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
          {isBusy ? 'Checking permissions...' : 'Allow all permissions'}
        </button>

        <button
          type="button"
          onClick={openAppSettings}
          style={{
            width: '100%',
            marginTop: 10,
            border: '1px solid rgba(74, 59, 50, 0.12)',
            borderRadius: 12,
            padding: '12px 16px',
            background: '#FFFFFF',
            color: '#4A3B32',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          Open app settings
        </button>
      </div>
    </div>
  );
}
