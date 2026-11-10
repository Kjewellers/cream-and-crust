import React from 'react';
import NativeBottomSheet from '../ui/NativeBottomSheet';

/**
 * AnimatedSheet — Physics-driven modal bottom sheet forwarding to NativeBottomSheet.
 */
export default function AnimatedSheet({ open, onClose, title = '', subtitle, children, maxWidth = 520 }) {
  return (
    <NativeBottomSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth={maxWidth}
    >
      {children}
    </NativeBottomSheet>
  );
}
