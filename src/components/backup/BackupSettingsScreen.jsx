/**
 * BackupSettingsScreen.jsx — Bakery Vault Settings UI
 *
 * Production-grade backup & restore settings inspired by WhatsApp
 * but branded as "Bakery Vault" for product identity.
 *
 * Sections:
 *  1. Backup Health Score card
 *  2. Big green "BACK UP" button with progress
 *  3. Cloud Backup Settings (Google Account, frequency, Wi-Fi, charging)
 *  4. What to Include (toggleable categories with counts)
 *  5. Local Backup (create, export, import)
 *  6. Restore Section
 *  7. Backup History (last 5 restore points)
 *  8. Encryption badge
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Cloud,
  HardDrive,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  Wifi,
  Database,
  Lock,
  ChevronRight,
  BatteryCharging,
  FolderDown,
  Trash2,
  FileDown,
  FileUp,
  Clock,
  Activity,
  UserCheck,
  XCircle,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { showToast, triggerHaptic } from '../iOS';
import { triggerConfetti } from '../DopamineKit';

export default function BackupSettingsScreen() {
  const { currentUser } = useAuth();
  const fileInputRef = useRef(null);

  // Lazy load the backup services
  const [services, setServices] = useState(null);
  const [status, setStatus] = useState(null);
  const [gdriveAccount, setGdriveAccount] = useState(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [isPhoneOnly, setIsPhoneOnly] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [driveBackups, setDriveBackups] = useState([]);
  const [showFreqModal, setShowFreqModal] = useState(false);
  const [showDriveRestoreModal, setShowDriveRestoreModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [fetchingDriveFiles, setFetchingDriveFiles] = useState(false);
  const [connectingGDrive, setConnectingGDrive] = useState(false);

  // Load services and status on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const svc = await import('../../services/backup');
        if (cancelled) return;
        setServices(svc);

        const s = svc.getBackupStatus();
        setStatus(s);
        setGdriveAccount(svc.getGDriveAccount());
        setIsGoogleUser(svc.isGoogleSignedIn());
        setIsPhoneOnly(svc.isPhoneOnlyUser());
      } catch (e) {
        console.error('[Vault UI] Failed to load services:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshStatus = useCallback(() => {
    if (!services) return;
    setStatus(services.getBackupStatus());
    setGdriveAccount(services.getGDriveAccount());
  }, [services]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleBackupNow = async () => {
    if (!currentUser?.uid || !services) {
      showToast('Please sign in to back up your data', 'error');
      return;
    }

    setBackingUp(true);
    setProgressMsg('Preparing backup...');
    setProgressPct(5);
    triggerHaptic('light');

    try {
      const result = await services.createBackup(currentUser.uid, {
        provider: status?.provider || 'google_drive',
        onProgress: ({ message, percent }) => {
          setProgressMsg(message);
          setProgressPct(percent);
        },
      });

      if (result.success) {
        triggerHaptic('success');
        try { triggerConfetti(); } catch {}
        showToast(`🔐 Backup secured! (${result.sizeLabel})`, 'success');
        refreshStatus();
      }
    } catch (e) {
      triggerHaptic('error');
      showToast(e?.message || 'Backup failed', 'error');
    } finally {
      setBackingUp(false);
      setProgressMsg('');
      setProgressPct(0);
    }
  };

  const handleConnectGDrive = async () => {
    if (!services) return;
    setConnectingGDrive(true);
    triggerHaptic('light');
    try {
      const account = await services.connectGoogleDrive();
      setGdriveAccount(account);
      triggerHaptic('success');
      showToast(`Connected: ${account.email}`, 'success');
    } catch (e) {
      triggerHaptic('error');
      showToast(e?.message || 'Failed to connect Google Account', 'error');
    } finally {
      setConnectingGDrive(false);
    }
  };

  const handleUpdateProvider = (provider) => {
    if (!services) return;
    services.updateBackupMeta({ provider });
    refreshStatus();
    triggerHaptic('medium');
    if (provider === 'google_drive' && !gdriveAccount) {
      handleConnectGDrive();
    }
  };

  const handleUpdateFrequency = (freq) => {
    if (!services) return;
    services.updateBackupMeta({ frequency: freq });
    refreshStatus();
    setShowFreqModal(false);
    showToast(`Auto-backup: ${freq}`, 'info');
  };

  const handleToggleMeta = (key) => {
    if (!services || !status) return;
    services.updateBackupMeta({ [key]: !status[key] });
    refreshStatus();
    triggerHaptic('light');
  };

  const handleToggleCategory = (cat) => {
    if (!services || !status) return;
    const cats = { ...status.categories, [cat]: !status.categories?.[cat] };
    services.updateBackupMeta({ categories: cats });
    refreshStatus();
    triggerHaptic('light');
  };

  const handleLocalBackup = async () => {
    if (!currentUser?.uid || !services) return;
    setBackingUp(true);
    setProgressMsg('Creating local backup...');
    setProgressPct(5);
    triggerHaptic('light');

    try {
      const result = await services.createBackup(currentUser.uid, {
        provider: 'local',
        onProgress: ({ message, percent }) => {
          setProgressMsg(message);
          setProgressPct(percent);
        },
      });

      if (result.success) {
        triggerHaptic('success');
        showToast(`💾 Local backup saved! (${result.sizeLabel})`, 'success');
        refreshStatus();
      }
    } catch (e) {
      triggerHaptic('error');
      showToast(e?.message || 'Local backup failed', 'error');
    } finally {
      setBackingUp(false);
      setProgressMsg('');
      setProgressPct(0);
    }
  };

  const handleAutoRestore = async () => {
    if (!services || !currentUser?.uid) return;
    
    let account = gdriveAccount;
    if (!account) {
      try {
        account = await services.connectGoogleDrive();
        setGdriveAccount(account);
      } catch (e) {
        showToast('Google Drive connection required', 'error');
        return;
      }
    }

    setRestoring(true);
    setProgressMsg('Locating latest backup...');
    triggerHaptic('light');

    try {
      const files = await services.listGDriveBackups();
      if (!files || files.length === 0) {
        showToast('No backups found in Google Drive', 'error');
        setRestoring(false);
        setProgressMsg('');
        return;
      }

      const latestBackupId = files[0].id;
      setProgressMsg('Restoring backup...');
      
      const result = await services.restoreFromCloud(currentUser.uid, latestBackupId, {
        onProgress: ({ message }) => setProgressMsg(message),
      });

      triggerHaptic('success');
      try { triggerConfetti(); } catch {}
      showToast(`✅ Restored ${result.restoredCount} records!`, 'success');
      refreshStatus();
    } catch (e) {
      triggerHaptic('error');
      showToast(e?.message || 'Restore failed', 'error');
    } finally {
      setRestoring(false);
      setProgressMsg('');
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.uid || !services) return;
    setRestoring(true);
    triggerHaptic('light');
    try {
      const data = await services.importFromFile(file);
      const result = await services.restoreFromLocal(currentUser.uid, data, {
        onProgress: ({ message }) => setProgressMsg(message),
      });
      triggerHaptic('success');
      try { triggerConfetti(); } catch {}
      showToast(`✅ Restored ${result.restoredCount} records from local backup!`, 'success');
      refreshStatus();
    } catch (e2) {
      triggerHaptic('error');
      showToast(e2?.message || 'Import failed', 'error');
    } finally {
      setRestoring(false);
      setProgressMsg('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Loading State ─────────────────────────────────────────────────────

  if (!services || !status) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 13, marginTop: 8 }}>Loading Bakery Vault...</div>
      </div>
    );
  }

  const activeEmail = gdriveAccount?.email || currentUser?.email || 'Not connected';

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".ccbkp,.json"
        style={{ display: 'none' }}
      />

      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px 0',
          display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.02em',
        }}>
          <Shield size={24} color="#059669" />
          Bakery Vault
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text3)', margin: 0 }}>
          Encrypted backup & restore for all your bakery data.
        </p>
      </div>

      {/* ── Backup Health Score Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: `linear-gradient(135deg, ${status.statusColor}10 0%, ${status.statusColor}05 100%)`,
          borderRadius: 18,
          border: `1.5px solid ${status.statusColor}30`,
          padding: 20,
          marginBottom: 20,
          boxShadow: `0 4px 16px ${status.statusColor}10`,
        }}
      >
        {/* Health Score Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `${status.statusColor}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            {status.statusEmoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', textTransform: 'capitalize' }}>
              {status.status === 'none' ? 'No Backup Yet' : `Backup ${status.status}`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Last Backup: {status.lastBackupLabel}
            </div>
          </div>
          <div style={{
            fontSize: 28, fontWeight: 900, color: status.statusColor,
            lineHeight: 1,
          }}>
            {status.integrityPercent}%
          </div>
        </div>

        {/* Health Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Encryption', value: status.hasBackup ? status.encryptionStatus : 'N/A', icon: Lock },
            { label: 'Restorable', value: status.restorable ? 'Yes' : 'No', icon: CheckCircle },
            { label: 'Storage', value: status.storageLabel, icon: Database },
          ].map((m) => (
            <div key={m.label} style={{
              background: 'var(--card)', borderRadius: 12, padding: '10px 12px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <m.icon size={11} />
                {m.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{m.value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Big BACK UP Button ── */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleBackupNow}
        disabled={backingUp || restoring}
        style={{
          width: '100%',
          background: backingUp ? 'var(--text3)' : 'linear-gradient(135deg, #059669, #10B981)',
          color: '#fff',
          border: 'none',
          borderRadius: 16,
          padding: '18px 28px',
          fontSize: 16,
          fontWeight: 800,
          cursor: backingUp ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          boxShadow: backingUp ? 'none' : '0 6px 20px rgba(5, 150, 105, 0.3)',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {backingUp && (
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 16,
            }}
          />
        )}
        {backingUp ? (
          <>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ position: 'relative', zIndex: 1 }}>{progressMsg || `Backing up... ${progressPct}%`}</span>
          </>
        ) : (
          <>
            <Shield size={20} />
            BACK UP NOW
          </>
        )}
      </motion.button>

      {/* ── Backup Provider Selector ── */}
      <div style={{
        background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)',
        padding: 20, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={16} color="var(--accent)" />
          Backup Destination
        </h3>

        {/* Phone-only user warning */}
        {isPhoneOnly && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: '#FEF3C7', border: '1.5px solid #F59E0B', borderRadius: 12,
              padding: 14, marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10,
            }}
          >
            <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                Cloud Backup requires Google Account
              </div>
              <div style={{ fontSize: 12, color: '#B45309', lineHeight: 1.4 }}>
                To use Cloud Backup across devices, link your Google Account.
              </div>
              <button
                onClick={handleConnectGDrive}
                style={{
                  marginTop: 8, background: '#D97706', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <UserCheck size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Link Google Account
              </button>
            </div>
          </motion.div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Google Drive */}
          <label
            onClick={() => handleUpdateProvider('google_drive')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 14, borderRadius: 14, cursor: 'pointer',
              border: status.provider === 'google_drive' ? '2px solid #059669' : '1.5px solid var(--border)',
              background: status.provider === 'google_drive' ? '#059669' + '08' : 'var(--bg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="radio"
                name="provider"
                checked={status.provider === 'google_drive'}
                onChange={() => {}}
                style={{ accentColor: '#059669', width: 18, height: 18 }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>☁️ Google Drive (Recommended)</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Encrypted backup in your Google account</div>
              </div>
            </div>
            {status.provider === 'google_drive' && <CheckCircle size={18} color="#059669" />}
          </label>

          {/* Local */}
          <label
            onClick={() => handleUpdateProvider('local')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 14, borderRadius: 14, cursor: 'pointer',
              border: status.provider === 'local' ? '2px solid #D97706' : '1.5px solid var(--border)',
              background: status.provider === 'local' ? '#D97706' + '08' : 'var(--bg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="radio"
                name="provider"
                checked={status.provider === 'local'}
                onChange={() => {}}
                style={{ accentColor: '#D97706', width: 18, height: 18 }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>💾 Local Device</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Encrypted backup on this device only</div>
              </div>
            </div>
            {status.provider === 'local' && <CheckCircle size={18} color="#D97706" />}
          </label>
        </div>

        {/* Local storage warning */}
        {status.provider === 'local' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              marginTop: 12, background: '#FEF2F2', border: '1.5px solid #FCA5A5',
              borderRadius: 12, padding: 14, display: 'flex', alignItems: 'flex-start', gap: 10,
            }}
          >
            <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.5 }}>
              <strong>Local backups stay only on this device.</strong> If this phone is lost or reset,
              your data cannot be restored unless you manually transfer the backup file.
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Auto-Backup & Google Drive Settings ── */}
      <div style={{
        background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)',
        padding: 20, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '0 0 14px 0' }}>
          Auto-Backup Settings
        </h3>

        {/* Frequency */}
        <SettingsRow onClick={() => setShowFreqModal(true)}>
          <Clock size={16} color="var(--text3)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Backup Frequency</div>
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, textTransform: 'capitalize' }}>
              {status.frequency === 'manual' ? 'Only when I tap Back Up' : status.frequency}
            </div>
          </div>
          <ChevronRight size={16} color="var(--text3)" />
        </SettingsRow>

        {/* Google Account */}
        <SettingsRow onClick={handleConnectGDrive} border>
          <UserCheck size={16} color="var(--text3)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Google Account</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{activeEmail}</div>
          </div>
          {connectingGDrive ? (
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              background: gdriveAccount ? '#ECFDF5' : 'var(--accent-lt)',
              color: gdriveAccount ? '#059669' : 'var(--accent)',
            }}>
              {gdriveAccount ? 'Connected' : 'Connect'}
            </span>
          )}
        </SettingsRow>

        {/* Wi-Fi Only */}
        <SettingsRow onClick={() => handleToggleMeta('wifiOnly')} border>
          <Wifi size={16} color="var(--text3)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Wi-Fi Only</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {status.wifiOnly ? 'Back up only on Wi-Fi' : 'Back up on any network'}
            </div>
          </div>
          <ToggleSwitch on={status.wifiOnly} />
        </SettingsRow>

        {/* Charging Only */}
        <SettingsRow onClick={() => handleToggleMeta('chargingOnly')} border last>
          <BatteryCharging size={16} color="var(--text3)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>While Charging</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {status.chargingOnly ? 'Auto-backup only when charging' : 'Any battery state'}
            </div>
          </div>
          <ToggleSwitch on={status.chargingOnly} />
        </SettingsRow>
      </div>

      {/* ── What to Include ── */}
      <div style={{
        background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)',
        padding: 20, marginBottom: 20,
      }}>
        <div
          onClick={() => setShowCategoryModal(!showCategoryModal)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color="var(--accent)" />
            What to Include
          </h3>
          <ChevronRight
            size={16}
            color="var(--text3)"
            style={{ transform: showCategoryModal ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </div>

        <AnimatePresence>
          {showCategoryModal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', marginTop: 14 }}
            >
              {[
                { key: 'orders', label: '📦 Orders', emoji: '📦' },
                { key: 'customers', label: '👥 Customers', emoji: '👥' },
                { key: 'products', label: '🧁 Products', emoji: '🧁' },
                { key: 'inventory', label: '📋 Inventory', emoji: '📋' },
                { key: 'recipes', label: '📖 Recipes', emoji: '📖' },
                { key: 'expenses', label: '💸 Expenses', emoji: '💸' },
                { key: 'settings', label: '⚙️ Settings & Theme', emoji: '⚙️' },
              ].map((cat, i, arr) => (
                <div
                  key={cat.key}
                  onClick={() => handleToggleCategory(cat.key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', cursor: 'pointer',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{cat.label}</span>
                  <ToggleSwitch on={status.categories?.[cat.key] !== false} />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Restore Section ── */}
      <div style={{
        background: 'var(--card)', borderRadius: 18, border: '1px solid var(--border)',
        padding: 20, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={16} color="#059669" />
          Restore Backup
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 14px 0' }}>
          Restore your bakery data from Google Drive or a local backup file.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <ActionButton
            onClick={handleAutoRestore}
            disabled={restoring}
            icon={<FolderDown size={15} />}
            label="From Google Drive"
            color="#059669"
          />
          <ActionButton
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
            icon={<FileUp size={15} />}
            label="From Local File"
            variant="outline"
          />
          <ActionButton
            onClick={handleLocalBackup}
            disabled={backingUp || restoring}
            icon={<FileDown size={15} />}
            label="Save Local Copy"
            variant="outline"
          />
        </div>

        {restoring && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            {progressMsg || 'Restoring...'}
          </div>
        )}
      </div>

      {/* ── Encryption Badge ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '14px 20px', borderRadius: 14,
        background: 'var(--bg)', border: '1px solid var(--border)',
        marginBottom: 20,
      }}>
        <Lock size={14} color="#059669" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>
          All backups are encrypted with AES-256-GCM
        </span>
        <Shield size={14} color="#059669" />
      </div>

      {/* ── Frequency Modal ── */}
      <AnimatePresence>
        {showFreqModal && (
          <ModalOverlay onClose={() => setShowFreqModal(false)}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: '0 0 16px 0' }}>
              Auto-Backup Frequency
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['daily', 'weekly', 'monthly', 'manual'].map((f) => (
                <button
                  key={f}
                  onClick={() => handleUpdateFrequency(f)}
                  style={{
                    padding: 14, borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                    border: status.frequency === f ? '2px solid #059669' : '1.5px solid var(--border)',
                    background: status.frequency === f ? '#05966910' : 'var(--bg)',
                    fontSize: 14, fontWeight: 700, textTransform: 'capitalize',
                    color: status.frequency === f ? '#059669' : 'var(--text2)',
                  }}
                >
                  {f === 'manual' ? 'Only when I tap "Back Up"' : f}
                </button>
              ))}
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Google Drive Restore Modal (Removed) ── */}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────────

function SettingsRow({ children, onClick, border, last }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
        borderBottom: last ? 'none' : border ? '1px solid var(--border)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {children}
    </div>
  );
}

function ToggleSwitch({ on }) {
  return (
    <div style={{
      width: 44, height: 26, borderRadius: 99, flexShrink: 0,
      background: on ? '#059669' : 'var(--border-md)',
      position: 'relative', transition: 'background 0.25s',
      boxShadow: on ? '0 2px 8px rgba(5,150,105,0.3)' : 'none',
    }}>
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
        style={{
          position: 'absolute', top: 2, left: 0,
          width: 22, height: 22, borderRadius: '50%',
          background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
}

function ActionButton({ onClick, disabled, icon, label, color, variant }) {
  const isOutline = variant === 'outline';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: isOutline ? 'var(--bg)' : (color || '#059669'),
        color: isOutline ? 'var(--text)' : '#fff',
        border: isOutline ? '1.5px solid var(--border)' : 'none',
        borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        opacity: disabled ? 0.5 : 1,
        boxShadow: isOutline ? 'none' : `0 2px 8px ${color || '#059669'}30`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function ModalOverlay({ children, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)', borderRadius: 22,
          maxWidth: 440, width: '100%', padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
