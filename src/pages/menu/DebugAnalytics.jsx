import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, where, doc, getDoc } from 'firebase/firestore';

export default function DebugAnalytics() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!currentUser?.uid) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'analytics_events'),
          where('bakeryId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));

        const sumRef = doc(db, 'analytics_summary', currentUser.uid);
        const sumSnap = await getDoc(sumRef);
        setSummary(sumSnap.exists() ? sumSnap.data() : null);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    fetchData();
  }, [currentUser?.uid]);

  if (loading) return <div style={{padding:40}}>Loading...</div>;

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', background: '#1a1a1a', color: '#0f0', minHeight: '100vh' }}>
      <h1>HARD TRACE DASHBOARD</h1>
      <div id="trace-output">
        <p>1. CURRENT DASHBOARD BAKERY ID: {currentUser?.uid}</p>
        <p>2. ANALYTICS_EVENTS FOUND: {events.length}</p>
        {events.length > 0 && (
          <p>LATEST EVENT BAKERY ID: {events[0].bakeryId}</p>
        )}
        <p>3. ANALYTICS_SUMMARY DOC BAKERY ID: {summary ? currentUser.uid : 'NOT FOUND'}</p>
        <p>SUMMARY DATA: {JSON.stringify(summary)}</p>
        <p>4. DASHBOARD QUERY TARGET: {currentUser?.uid}</p>
      </div>
    </div>
  );
}
