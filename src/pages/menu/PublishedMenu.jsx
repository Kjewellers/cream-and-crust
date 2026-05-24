import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import MenuRenderer from '../../components/menu/MenuRenderer';
import { getBusinessByUsername, getMenuSettingsByUserId, subscribeToProducts } from '../../services/db';

export default function PublishedMenu() {
  const { username } = useParams();
  const [business, setBusiness] = useState(null);
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProducts;
    const load = async () => {
      const biz = await getBusinessByUsername(username);
      if (!biz) {
        setLoading(false);
        return;
      }
      setBusiness(biz);
      const menuSettings = await getMenuSettingsByUserId(biz.id);
      setSettings(menuSettings);
      unsubscribeProducts = subscribeToProducts((items) => {
        setProducts(items || []);
        setLoading(false);
      }, null, biz.id);
    };

    load();
    return () => {
      if (unsubscribeProducts) unsubscribeProducts();
    };
  }, [username]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fffaf5' }}>
        <Sparkles className="animate-spin" color="#B5606A" />
      </div>
    );
  }

  if (!business) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', background: '#fffaf5' }}>
        <div>
          <h1>Menu Not Found</h1>
          <p style={{ color: '#8C7A6B' }}>This bakery has not published a menu yet.</p>
        </div>
      </div>
    );
  }

  return <MenuRenderer business={business} settings={settings || {}} products={products} />;
}
