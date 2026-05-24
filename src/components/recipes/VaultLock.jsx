import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, Settings, Fingerprint } from 'lucide-react';
import { showToast, triggerHaptic } from '../iOS';
import { updateRecipeVaultPin, updateRecipeVaultBiometrics } from '../../services/auth';
import { bufferToBase64url, base64urlToBuffer } from '../../utils/webauthn';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

async function hashPin(pin) {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  // Fallback for Edge non-secure contexts
  return btoa(encodeURIComponent(pin)).replace(/[^a-zA-Z0-9]/g, '');
}

export function VaultLock({ onUnlock }) {
  const { currentUser } = useAuth();
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [storedHash, setStoredHash] = useState(null);
  const [credId, setCredId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bioAvail, setBioAvail] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.recipeVaultPin === 'disabled') { onUnlock(); return; }
          setStoredHash(d.recipeVaultPin || null);
          setCredId(d.recipeVaultCredentialId || null);
        }
        if (window.PublicKeyCredential && await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) {
          setBioAvail(true);
        }
      } catch { onUnlock(); }
      finally { setLoading(false); }
    })();
  }, []);

  const tryBio = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge, timeout: 60000, userVerification: 'required',
          allowCredentials: credId ? [{ type: 'public-key', id: base64urlToBuffer(credId) }] : []
        }
      });
      if (assertion) { triggerHaptic('success'); onUnlock(); }
    } catch { showToast('Biometric failed', 'error'); }
  };

  const handleKey = async (val) => {
    if (val === 'del') { setPin(p => p.slice(0, -1)); return; }
    const next = pin + String(val);
    setPin(next);
    if (next.length === 4) {
      const hashed = await hashPin(next);
      if (!storedHash) {
        await updateRecipeVaultPin(currentUser.uid, hashed);
        showToast('Vault PIN set! 🔐', 'success');
        onUnlock();
      } else if (hashed === storedHash) {
        triggerHaptic('success'); onUnlock();
      } else {
        setShake(true); triggerHaptic('error');
        setTimeout(() => { setPin(''); setShake(false); }, 600);
      }
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div className="rc-spinner" />
    </div>
  );

  return (
    <div className="rc-vault-screen">
      <motion.div animate={shake ? { x: [-12, 12, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.5 }}>
        <div className="rc-vault-icon"><Lock size={28} /></div>
        <h2 className="rc-vault-title">{storedHash ? 'Unlock Recipe Vault' : 'Secure Your Vault'}</h2>
        <p className="rc-vault-sub">{storedHash ? 'Enter your 4-digit PIN' : 'Set a secret 4-digit PIN'}</p>
        <div className="rc-dots">
          {[0,1,2,3].map(i => <div key={i} className={`rc-dot ${pin.length > i ? 'active' : ''}`} />)}
        </div>
      </motion.div>

      <div className="rc-keypad">
        {[1,2,3,4,5,6,7,8,9, bioAvail ? 'bio' : '', 0, 'del'].map((k, i) => (
          <div key={i} className="rc-key-cell">
            {k !== '' && (
              <motion.button whileTap={{ scale: 0.85 }} className={`rc-key ${k === 'bio' ? 'bio' : ''}`}
                onClick={() => k === 'bio' ? tryBio() : handleKey(k)}>
                {k === 'del' ? <X size={18} /> : k === 'bio' ? <Fingerprint size={24} /> : k}
              </motion.button>
            )}
          </div>
        ))}
      </div>

      {!storedHash && (
        <button className="rc-skip-btn" onClick={async () => {
          await updateRecipeVaultPin(currentUser.uid, 'disabled');
          onUnlock();
        }}>Skip — no password</button>
      )}
    </div>
  );
}

export function VaultSettings({ onClose }) {
  const { currentUser } = useAuth();
  const [storedHash, setStoredHash] = useState(null);
  const [credId, setCredId] = useState(null);
  const [bioAvail, setBioAvail] = useState(false);
  const [curPin, setCurPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confPin, setConfPin] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) { setStoredHash(snap.data().recipeVaultPin); setCredId(snap.data().recipeVaultCredentialId); }
      if (window.PublicKeyCredential && await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) setBioAvail(true);
      setLoading(false);
    })();
  }, []);

  const handleChange = async (e) => {
    e.preventDefault();
    if (newPin !== confPin) return showToast('PINs do not match', 'error');
    if (newPin.length !== 4) return showToast('PIN must be 4 digits', 'error');
    if (storedHash && storedHash !== 'disabled') {
      if (await hashPin(curPin) !== storedHash) return showToast('Current PIN incorrect', 'error');
    }
    await updateRecipeVaultPin(currentUser.uid, await hashPin(newPin));
    showToast('PIN updated! 🔐', 'success');
    onClose();
  };

  const handleDisable = async () => {
    if (!curPin) return showToast('Enter current PIN', 'error');
    if (await hashPin(curPin) !== storedHash) return showToast('Wrong PIN', 'error');
    await updateRecipeVaultPin(currentUser.uid, 'disabled');
    await updateRecipeVaultBiometrics(currentUser.uid, null);
    showToast('PIN disabled', 'info'); onClose();
  };

  const registerBio = async () => {
    try {
      const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16); window.crypto.getRandomValues(userId);
      const cred = await navigator.credentials.create({ publicKey: {
        challenge, rp: { name: 'Cream & Crust Vault' },
        user: { id: userId, name: currentUser.email, displayName: currentUser.displayName || 'Baker' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' }, timeout: 60000
      }});
      if (cred) {
        const id = bufferToBase64url(cred.rawId);
        await updateRecipeVaultBiometrics(currentUser.uid, id);
        setCredId(id); showToast('Biometrics enabled!', 'success');
      }
    } catch { showToast('Biometric setup failed', 'error'); }
  };

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><div className="rc-spinner" /></div>;

  return (
    <div>
      <form onSubmit={handleChange} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <h4 className="rc-settings-section-title">{storedHash && storedHash !== 'disabled' ? 'Change PIN' : 'Activate PIN Lock'}</h4>
        {storedHash && storedHash !== 'disabled' && (
          <input className="rc-input" type="password" inputMode="numeric" maxLength={4} placeholder="Current PIN" value={curPin} onChange={e => setCurPin(e.target.value.replace(/\D/g,''))} />
        )}
        <input className="rc-input" type="password" inputMode="numeric" maxLength={4} placeholder="New 4-digit PIN" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,''))} />
        <input className="rc-input" type="password" inputMode="numeric" maxLength={4} placeholder="Confirm PIN" value={confPin} onChange={e => setConfPin(e.target.value.replace(/\D/g,''))} />
        <button type="submit" className="rc-btn primary">Save PIN</button>
      </form>

      {storedHash && storedHash !== 'disabled' && (
        <div style={{ marginBottom: 24 }}>
          <h4 className="rc-settings-section-title" style={{ color: '#B5606A' }}>Disable PIN</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="rc-input" type="password" inputMode="numeric" maxLength={4} placeholder="Confirm PIN" value={curPin} onChange={e => setCurPin(e.target.value.replace(/\D/g,''))} style={{ flex: 1 }} />
            <button className="rc-btn danger" onClick={handleDisable}>Disable</button>
          </div>
        </div>
      )}

      {storedHash && storedHash !== 'disabled' && bioAvail && (
        <div>
          <h4 className="rc-settings-section-title">Biometrics</h4>
          {credId
            ? <button className="rc-btn danger" style={{ width: '100%' }} onClick={async () => { await updateRecipeVaultBiometrics(currentUser.uid, null); setCredId(null); showToast('Biometrics removed', 'info'); }}>Remove Biometrics</button>
            : <button className="rc-btn secondary" style={{ width: '100%' }} onClick={registerBio}>Enable Face / Touch ID</button>
          }
        </div>
      )}
    </div>
  );
}
