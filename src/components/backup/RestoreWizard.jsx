/**
 * RestoreWizard.jsx — Bakery Vault First-Login Restore Flow
 *
 * Full-screen modal wizard shown on first login or device migration.
 * Detects cloud backup, shows rich preview, handles restore.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Cloud, Download, ArrowRight, CheckCircle, Smartphone, Server, Loader2, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { showToast, triggerHaptic } from '../iOS';
import { triggerConfetti } from '../DopamineKit';

export default function RestoreWizard({ onComplete, onSkip }) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState('detecting'); // detecting, preview, restoring, complete, error
  const [backupPreview, setBackupPreview] = useState(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [services, setServices] = useState(null);
  const [backupId, setBackupId] = useState(null);

  // Lazy load services
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const svc = await import('../../services/backup');
        if (cancelled) return;
        setServices(svc);
      } catch (e) {
        if (!cancelled) {
          setErrorMsg('Failed to initialize restore engine');
          setStep('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-detect on mount (if services loaded)
  useEffect(() => {
    if (!services || !currentUser?.uid) return;

    let cancelled = false;
    const detect = async () => {
      try {
        // Ensure Google Drive is connected
        let account = services.getGDriveAccount();
        if (!account && services.isGoogleSignedIn()) {
          account = await services.connectGoogleDrive();
        }

        if (!account) {
          // Can't auto-detect without account
          onSkip();
          return;
        }

        const result = await services.detectCloudBackup(currentUser.uid);
        if (cancelled) return;

        if (!result.found || !result.latest) {
          onSkip(); // No backup found, silently skip
          return;
        }

        setBackupId(result.latest.id);

        // Auto restore
        setStep('restoring');
        setProgressMsg('Restoring your bakery...');
        triggerHaptic('medium');

        try {
          const restoreResult = await services.restoreFromCloud(currentUser.uid, result.latest.id, {
            onProgress: ({ message, percent }) => {
              setProgressMsg(message);
              setProgressPct(percent);
            }
          });
          
          if (cancelled) return;
          
          if (restoreResult.success) {
            setStep('complete');
            triggerHaptic('success');
            try { triggerConfetti(); } catch {}
          }
        } catch (e) {
          if (cancelled) return;
          setErrorMsg(e?.message || 'Restore failed');
          setStep('error');
          triggerHaptic('error');
        }
      } catch (e) {
        if (cancelled) return;
        // Don't block the user if detection fails
        onSkip();
      }
    };

    detect();
    return () => { cancelled = true; };
  }, [services, currentUser, onSkip]);

  // ── Render Steps ───────────────────────────────────────────────────────

  if (step === 'detecting') {
    return (
      <WizardContainer>
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ width: 80, height: 80, background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
        >
          <Cloud size={40} color="#059669" />
        </motion.div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>
          Searching for backups...
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text3)', textAlign: 'center' }}>
          Checking Bakery Vault for existing data.
        </p>
      </WizardContainer>
    );
  }

  if (step === 'restoring') {
    return (
      <WizardContainer>
        <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
          <motion.svg width="80" height="80" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r="45" fill="none" stroke="#059669" strokeWidth="6"
              strokeDasharray={2 * Math.PI * 45}
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - progressPct / 100) }}
              transition={{ duration: 0.3 }}
            />
          </motion.svg>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Server size={32} color="#059669" />
          </div>
        </div>
        
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>
          Restoring your bakery...
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text3)', textAlign: 'center' }}>
          {progressMsg || 'Please keep the app open.'}
        </p>
      </WizardContainer>
    );
  }

  if (step === 'complete') {
    return (
      <WizardContainer>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={{ width: 80, height: 80, background: '#059669', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
        >
          <CheckCircle size={40} color="#fff" />
        </motion.div>
        
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>
          Restore Complete!
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text3)', textAlign: 'center', marginBottom: 32 }}>
          Your bakery data has been successfully restored. You're ready to get back to work.
        </p>

        <button
          onClick={onComplete}
          style={{ width: '100%', background: '#111', color: '#fff', border: 'none', borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          Continue
          <ArrowRight size={20} />
        </button>
      </WizardContainer>
    );
  }

  if (step === 'error') {
    return (
      <WizardContainer>
        <div style={{ width: 80, height: 80, background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <AlertTriangle size={40} color="#DC2626" />
        </div>
        
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8, textAlign: 'center' }}>
          Restore Failed
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text3)', textAlign: 'center', marginBottom: 32 }}>
          {errorMsg}
        </p>

        <button
          onClick={onSkip}
          style={{ width: '100%', background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--text)', borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: 12 }}
        >
          Continue Anyway
        </button>
      </WizardContainer>
    );
  }

  return null;
}

function WizardContainer({ children }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--bg)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%', maxWidth: 400,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
