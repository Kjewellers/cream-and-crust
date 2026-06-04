import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function PublicOrderForm() {
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the published menu page
    navigate(`/menu/${username}`, { replace: true });
  }, [username, navigate]);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <Loader2 className="animate-spin" size={32} color="var(--accent)" />
    </div>
  );
}
