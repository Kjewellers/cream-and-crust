import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  publishMenuSettings,
  subscribeToBusiness,
  subscribeToMenuSettings,
  subscribeToProducts,
  updateMenuSettings,
  updateProductInDB
} from '../../services/db';
import { mergeMenuSettings } from '../../data/menuDefaults';

export function useMenuBuilderData() {
  const { currentUser } = useAuth();
  const [business, setBusiness] = useState(null);
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    const unsubBiz = subscribeToBusiness((biz) => setBusiness(biz), null, currentUser.uid);
    const unsubMenu = subscribeToMenuSettings(currentUser.uid, (data) => {
      setSettings(data || {});
      setLoading(false);
    });
    const unsubProducts = subscribeToProducts((items) => setProducts(items || []), null, currentUser.uid);

    return () => {
      unsubBiz();
      unsubMenu();
      unsubProducts();
    };
  }, [currentUser?.uid]);

  const menu = useMemo(() => mergeMenuSettings(business || {}, settings || {}), [business, settings]);
  const username = business?.username || currentUser?.email?.split('@')[0] || 'menu';

  const saveMenu = async (patch) => {
    const next = { ...menu, ...patch, theme: { ...menu.theme, ...(patch.theme || {}) } };
    await updateMenuSettings(currentUser.uid, next);
  };

  const publishMenu = async () => {
    await publishMenuSettings(currentUser.uid, menu);
  };

  const saveProduct = async (productId, patch) => {
    await updateProductInDB(productId, patch);
  };

  return {
    currentUser,
    business,
    username,
    menu,
    products,
    loading,
    saveMenu,
    publishMenu,
    saveProduct
  };
}
