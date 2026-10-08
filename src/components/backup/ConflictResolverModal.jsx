/**
 * ConflictResolverModal.jsx — Bakery Vault Conflict Resolution UI
 *
 * Renders a side-by-side diff UI for records that have diverged between
 * the local device and the cloud backup. Allows the user to choose
 * Keep Local, Keep Cloud, or Merge.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Smartphone, Cloud, ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import { RESOLUTION_STRATEGIES, getConflictSummary } from '../../services/backup/ConflictResolver';
import { triggerHaptic } from '../iOS';

export default function ConflictResolverModal({ conflicts, onResolve }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutions, setResolutions] = useState({}); // recordId -> strategy

  if (!conflicts || conflicts.length === 0) return null;

  const currentConflict = conflicts[currentIndex];
  const summary = getConflictSummary(currentConflict);

  const handleResolveSingle = (strategy) => {
    triggerHaptic('light');
    setResolutions((prev) => ({
      ...prev,
      [currentConflict.recordId]: strategy,
    }));

    if (currentIndex < conflicts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleFinish = () => {
    triggerHaptic('success');
    
    // Map the resolutions back to the format expected by RestoreService
    const resolvedConflicts = conflicts.map((c) => ({
      ...c,
      strategy: resolutions[c.recordId] || RESOLUTION_STRATEGIES.MERGE,
    }));
    
    onResolve(resolvedConflicts);
  };

  const handleResolveAll = (strategy) => {
    triggerHaptic('medium');
    const all = {};
    for (const c of conflicts) {
      all[c.recordId] = strategy;
    }
    setResolutions(all);
    
    const resolvedConflicts = conflicts.map((c) => ({
      ...c,
      strategy,
    }));
    onResolve(resolvedConflicts);
  };

  const isComplete = Object.keys(resolutions).length === conflicts.length;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'var(--bg)', borderRadius: 24, width: '100%', maxWidth: 500,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="#DC2626" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Sync Conflicts</h2>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                {conflicts.length} record{conflicts.length !== 1 && 's'} need your attention
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.4, marginTop: 12 }}>
            These records were changed on this device and also updated in the backup.
            Choose which version to keep.
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
          {isComplete ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircle2 size={48} color="#059669" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>All resolved</h3>
              <p style={{ fontSize: 14, color: 'var(--text3)' }}>Ready to continue the restore process.</p>
              
              <button
                onClick={handleFinish}
                style={{
                  marginTop: 24, background: '#059669', color: '#fff', border: 'none',
                  borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Apply & Continue
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>
                    Conflict {currentIndex + 1} of {conflicts.length}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {summary.title}
                  </div>
                </div>
                
                <div style={{ fontSize: 13, color: '#D97706', fontWeight: 600, marginBottom: 16, background: '#FEF3C7', padding: '8px 12px', borderRadius: 8, display: 'inline-block' }}>
                  {summary.subtitle}
                </div>

                {/* Diff View */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                  {/* Local Card */}
                  <div
                    onClick={() => handleResolveSingle(RESOLUTION_STRATEGIES.KEEP_LOCAL)}
                    style={{
                      border: '2px solid var(--border)', borderRadius: 16, padding: 16,
                      cursor: 'pointer', transition: 'border-color 0.2s',
                      background: 'var(--card)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text2)', fontWeight: 600, fontSize: 13 }}>
                      <Smartphone size={16} /> This Device
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentConflict.changedFields.map((field) => (
                        <div key={field}>
                          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>{field}</div>
                          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, wordBreak: 'break-all' }}>
                            {JSON.stringify(currentConflict.localVersion[field]) || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)' }}>
                      Updated: {new Date(currentConflict.localTimestamp).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Cloud Card */}
                  <div
                    onClick={() => handleResolveSingle(RESOLUTION_STRATEGIES.KEEP_CLOUD)}
                    style={{
                      border: '2px solid var(--border)', borderRadius: 16, padding: 16,
                      cursor: 'pointer', transition: 'border-color 0.2s',
                      background: 'var(--card)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#059669', fontWeight: 600, fontSize: 13 }}>
                      <Cloud size={16} /> Backup
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentConflict.changedFields.map((field) => (
                        <div key={field}>
                          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>{field}</div>
                          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, wordBreak: 'break-all' }}>
                            {JSON.stringify(currentConflict.cloudVersion[field]) || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)' }}>
                      Updated: {new Date(currentConflict.cloudTimestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleResolveSingle(RESOLUTION_STRATEGIES.MERGE)}
                    style={{
                      background: 'var(--bg)', color: 'var(--text)', border: '1.5px solid var(--border)',
                      borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Smart Merge (Keep newest per field)
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {!isComplete && (
          <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, background: 'var(--card)' }}>
            <button
              onClick={() => handleResolveAll(RESOLUTION_STRATEGIES.KEEP_LOCAL)}
              style={{ flex: 1, background: 'var(--bg)', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}
            >
              Keep All Local
            </button>
            <button
              onClick={() => handleResolveAll(RESOLUTION_STRATEGIES.MERGE)}
              style={{ flex: 1, background: '#059669', border: 'none', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
            >
              Merge All
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
