import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  publishMenuSettings,
  subscribeToBusiness,
  subscribeToMenuSettings,
  subscribeToProducts,
  updateMenuSettings,
  updateProductInDB,
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
    const unsubProducts = subscribeToProducts(
      (items) => setProducts(items || []),
      null,
      currentUser.uid
    );

    return () => {
      unsubBiz();
      unsubMenu();
      unsubProducts();
    };
  }, [currentUser?.uid]);

  const menu = useMemo(
    () => mergeMenuSettings(business || {}, settings || {}),
    [business, settings]
  );
  const username = business?.username || currentUser?.email?.split('@')[0] || 'menu';

  // Products sorted by their saved menu order (menuOrder). Products without
  // an explicit order fall back to their natural position so legacy data
  // still renders sensibly.
  const orderedProducts = useMemo(() => {
    const withIndex = (products || []).map((p, i) => ({ p, i }));
    withIndex.sort((a, b) => {
      const oa = Number.isFinite(a.p.menuOrder) ? a.p.menuOrder : a.i + 1000;
      const ob = Number.isFinite(b.p.menuOrder) ? b.p.menuOrder : b.i + 1000;
      return oa - ob;
    });
    return withIndex.map(({ p }) => p);
  }, [products]);

  const saveMenu = async (patch) => {
    const next = { ...menu, ...patch, theme: { ...menu.theme, ...(patch.theme || {}) } };
    await updateMenuSettings(currentUser.uid, next);
  };

  const publishMenu = async (patch) => {
    const nextMenu = patch ? { ...menu, ...patch, theme: { ...menu.theme, ...(patch.theme || {}) } } : menu;
    await publishMenuSettings(currentUser.uid, nextMenu);
  };

  const saveProduct = async (productId, patch) => {
    await updateProductInDB(productId, patch);
  };

  // Persist a new ordering. `orderedList` is the full array of products in
  // the desired visual order; we write a 0-based `menuOrder` to each.
  const saveProductOrder = async (orderedList) => {
    await Promise.all(
      orderedList.map((product, index) =>
        Number.isFinite(product.menuOrder) && product.menuOrder === index
          ? Promise.resolve()
          : updateProductInDB(product.id, { menuOrder: index })
      )
    );
  };

  return {
    currentUser,
    business,
    username,
    menu,
    products: orderedProducts,
    loading,
    saveMenu,
    publishMenu,
    saveProduct,
    saveProductOrder,
  };
}
