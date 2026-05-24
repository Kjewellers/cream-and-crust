import React from 'react';
import MenuRenderer from '../../components/menu/MenuRenderer';
import { useMenuBuilderData } from './useMenuBuilderData';
import MenuBuilderShell from './MenuBuilderShell';

export default function MenuLivePreview() {
  const { business, menu, products, loading } = useMenuBuilderData();

  if (loading) return <div style={{ padding: 40, fontWeight: 800 }}>Loading preview...</div>;

  return (
    <MenuBuilderShell title="Live Preview" subtitle="A real responsive menu page, not a screenshot or fixed phone mockup.">
      <MenuRenderer business={business} settings={menu} products={products} preview />
    </MenuBuilderShell>
  );
}
