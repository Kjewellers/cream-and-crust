/**
 * UrlSecurityGuard.jsx
 * Enterprise Zero-Trust URL & Parameter Ownership Security Guard
 *
 * Prevents URL parameter tampering (e.g. /orders/other-user-doc-id).
 * Validates resource ownership on the client side before rendering,
 * rendering a HTTP 403 Forbidden screen if mismatch occurs.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { auditLog, AUDIT } from '../../services/auditLog';

export default function UrlSecurityGuard({
  children,
  resourceFetcher,
  ownerIdKey = 'uid',
  resourceName = 'Document',
}) {
  const params = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function checkOwnership() {
      if (!currentUser || !currentUser.uid) {
        if (isMounted) {
          setAccessDenied(true);
          setErrorMessage('Authentication required to access this resource.');
          setLoading(false);
        }
        return;
      }

      // If no fetcher provided, pass through
      if (!resourceFetcher) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const resource = await resourceFetcher(params);

        if (!resource) {
          // Document does not exist or user doesn't have read permission
          if (isMounted) {
            setAccessDenied(true);
            setErrorMessage(`${resourceName} not found or permission denied.`);
            setLoading(false);
          }
          return;
        }

        const resourceOwnerUid = resource[ownerIdKey] || resource.uid || resource.bakeryId;

        if (resourceOwnerUid && resourceOwnerUid !== currentUser.uid) {
          // Security Alert — URL Manipulation Attempt Detected!
          console.warn(
            `[ZeroTrust Security Alert] Blocked attempt by UID ${currentUser.uid} to view ${resourceName} owned by ${resourceOwnerUid}`
          );

          await auditLog(AUDIT.SUSPICIOUS_ACCESS, currentUser.uid, {
            attemptedPath: window.location.pathname,
            targetOwnerId: resourceOwnerUid,
            resourceName,
          });

          if (isMounted) {
            setAccessDenied(true);
            setErrorMessage('403 Forbidden: You do not have permission to view another bakery\'s data.');
            setLoading(false);
          }
          return;
        }

        // Access Granted!
        if (isMounted) {
          setAccessDenied(false);
          setLoading(false);
        }
      } catch (err) {
        console.error('[UrlSecurityGuard] Error checking ownership:', err);
        if (isMounted) {
          setAccessDenied(true);
          setErrorMessage('Access denied by security policy.');
          setLoading(false);
        }
      }
    }

    checkOwnership();

    return () => {
      isMounted = false;
    };
  }, [params, currentUser, resourceFetcher, ownerIdKey, resourceName]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <div style={{ color: '#888', fontSize: '14px' }}>Verifying Zero-Trust Security Ownership...</div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          minHeight: '60vh',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}
        >
          <ShieldAlert size={36} color="#EF4444" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1F2937', marginBottom: '12px' }}>
          403 Forbidden — Access Denied
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280', maxWidth: '440px', marginBottom: '24px', lineHeight: '1.5' }}>
          {errorMessage || 'Your account does not have permission to view or modify this bakery document.'}
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            backgroundColor: '#111827',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} /> Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
