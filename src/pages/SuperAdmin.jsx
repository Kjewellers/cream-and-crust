import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Activity, Users, DollarSign, Bug, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function SuperAdmin() {
  const { currentUser } = useAuth();
  const [crashes, setCrashes] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Basic security check: Only try loading if we exist.
    // Real security is in Firestore Rules: request.auth.token.admin == true
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch last 10 crashes
        const qCrashes = query(collection(db, 'crash_reports'), orderBy('timestamp', 'desc'), limit(10));
        const crashSnap = await getDocs(qCrashes);
        setCrashes(crashSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch last 15 audit logs
        const qAudits = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(15));
        const auditSnap = await getDocs(qAudits);
        setAudits(auditSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setError(null);
      } catch (err) {
        console.error('Admin fetch error:', err);
        setError('Unauthorized or Network Error. Are you an Admin?');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
        <div style={{ animation: 'pulse 1.5s infinite', color: '#B5606A' }}>Loading Admin Data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <ShieldAlert size={48} color="#D4A050" style={{ marginBottom: 16 }} />
        <h2 style={{ color: '#2D1B14' }}>Access Denied</h2>
        <p style={{ color: '#5C4F46', marginTop: 8 }}>{error}</p>
        <Link to="/" style={{ display: 'inline-block', marginTop: 24, padding: '10px 20px', background: '#2D1B14', color: '#FFF', borderRadius: 8, textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
      <header style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ background: '#2D1B14', color: '#FFF', padding: 10, borderRadius: 12 }}>
          <Activity size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#2D1B14', margin: 0, fontFamily: '"Playfair Display", serif' }}>
            System Console
          </h1>
          <p style={{ margin: 0, color: '#5C4F46', fontSize: 13, marginTop: 4 }}>
            Production SaaS Monitoring Dashboard
          </p>
        </div>
      </header>

      {/* Top Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon={<Bug size={20} color="#B5606A" />} title="Recent Crashes" value={crashes.length} />
        <StatCard icon={<FileText size={20} color="#D4A050" />} title="Audit Events" value={audits.length} />
        <StatCard icon={<Users size={20} color="#4A90E2" />} title="Active Users" value="Live Analytics" link="https://analytics.google.com" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
        {/* Crash Reports Panel */}
        <div style={{ background: '#FFF', border: '1px solid #EAE2D8', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(74,59,50,0.04)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2D1B14', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Bug size={16} color="#B5606A" /> Unresolved Crashes
          </h2>
          {crashes.length === 0 ? (
            <p style={{ color: '#5C4F46', fontSize: 13 }}>No recent crashes detected.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {crashes.map(crash => (
                <div key={crash.id} style={{ background: '#FFF7F7', borderLeft: '4px solid #B5606A', padding: 12, borderRadius: 4 }}>
                  <div style={{ fontSize: 12, color: '#B5606A', fontWeight: 600 }}>{crash.errorMsg}</div>
                  <div style={{ fontSize: 11, color: '#5C4F46', marginTop: 4, fontFamily: 'monospace' }}>
                    UID: {crash.uid || 'Anonymous'}
                  </div>
                  <div style={{ fontSize: 11, color: '#5C4F46', marginTop: 2 }}>
                    {crash.timestamp?.toDate ? format(crash.timestamp.toDate(), 'PPpp') : 'Unknown Date'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Logs Panel */}
        <div style={{ background: '#FFF', border: '1px solid #EAE2D8', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(74,59,50,0.04)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2D1B14', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FileText size={16} color="#D4A050" /> Live Audit Trail
          </h2>
          {audits.length === 0 ? (
            <p style={{ color: '#5C4F46', fontSize: 13 }}>No audit logs found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {audits.map(audit => (
                <div key={audit.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 8, borderBottom: '1px solid #F5EFEB' }}>
                  <div style={{ background: '#F5EFEB', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: '#2D1B14', textTransform: 'uppercase' }}>
                    {audit.action.replace('_', ' ')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#5C4F46', fontFamily: 'monospace' }}>{audit.uid}</div>
                    <div style={{ fontSize: 10, color: '#8A7A6E', marginTop: 2 }}>
                      {audit.timestamp?.toDate ? format(audit.timestamp.toDate(), 'MMM d, h:mm a') : 'Now'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, link }) {
  const content = (
    <div style={{ background: '#FFF', border: '1px solid #EAE2D8', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 4px 12px rgba(74,59,50,0.04)' }}>
      <div style={{ background: '#FFFDF9', padding: 12, borderRadius: 12, border: '1px solid #F5EFEB' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, color: '#5C4F46', fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#2D1B14', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );

  if (link) {
    return <a href={link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>{content}</a>;
  }
  return content;
}
