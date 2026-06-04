/**
 * @file useOrderFlow.jsx
 *
 * Shared hook that gives every public-menu renderer the same
 * order flow:
 *
 *   For weight-based products (cakes etc.):
 *     customer taps "Order" → weight picker → channel picker →
 *       (a) website form, (b) WhatsApp, or (c) Instagram.
 *
 *   For non-weight products:
 *     customer taps "Order" → channel picker →
 *       (a) website form, (b) WhatsApp, or (c) Instagram.
 *
 * The weight + calculated price flows through to every downstream
 * component so the order data is consistent everywhere.
 *
 * Usage:
 *   const order = useOrderFlow({ business, data });
 *   <button onClick={() => order.open(product)}>Order</button>
 *   {order.modals}
 */

import React, { useState, useCallback } from 'react';
import WeightPicker, { isWeightCategory } from './WeightPicker';
import OrderChannelPicker from './OrderChannelPicker';
import MenuOrderForm from './MenuOrderForm';

export default function useOrderFlow({ business, data }) {
  const [weightPickerOpen, setWeightPickerOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);

  // Weight selection data — attached to activeProduct so it flows
  // through to channel picker, WhatsApp msg, and website form.
  const [weightData, setWeightData] = useState(null);

  const open = useCallback((product = null) => {
    const prod = product || null;
    setActiveProduct(prod);
    setWeightData(null);
    setFormOpen(false);
    setPickerOpen(false);

    // If the product belongs to a cake-like category, show weight
    // picker first. Otherwise go straight to channel picker.
    if (prod && isWeightCategory(prod.category)) {
      setWeightPickerOpen(true);
    } else {
      setPickerOpen(true);
    }
  }, []);

  const closeAll = useCallback(() => {
    setWeightPickerOpen(false);
    setPickerOpen(false);
    setFormOpen(false);
    setActiveProduct(null);
    setWeightData(null);
  }, []);

  const closeWeightPicker = useCallback(() => setWeightPickerOpen(false), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const closeForm = useCallback(() => {
    setFormOpen(false);
    setActiveProduct(null);
    setWeightData(null);
  }, []);

  // Weight picker confirmed → enrich product with weight data and
  // proceed to channel picker.
  const handleWeightConfirm = useCallback((wd) => {
    setWeightData(wd);
    setWeightPickerOpen(false);
    setPickerOpen(true);
  }, []);

  const goToForm = useCallback(() => {
    setPickerOpen(false);
    setFormOpen(true);
  }, []);

  // Build an enriched product that includes weight info so downstream
  // components (channel picker, order form, WhatsApp message) can
  // use it without knowing about the weight picker.
  const enrichedProduct =
    activeProduct && weightData
      ? {
          ...activeProduct,
          selectedWeight: weightData.weight,
          selectedWeightLabel: weightData.weightLabel,
          price: weightData.calculatedPrice,
          originalPrice: activeProduct.price,
        }
      : activeProduct;

  const modals = (
    <>
      <WeightPicker
        open={weightPickerOpen}
        onClose={closeWeightPicker}
        onConfirm={handleWeightConfirm}
        product={activeProduct}
      />
      <OrderChannelPicker
        open={pickerOpen}
        onClose={closePicker}
        onSelectForm={goToForm}
        business={business}
        data={data}
        product={enrichedProduct}
      />
      <MenuOrderForm
        open={formOpen}
        onClose={closeForm}
        business={business}
        data={data}
        product={enrichedProduct}
      />
    </>
  );

  return { open, modals };
}
