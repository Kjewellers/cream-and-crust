import { useEffect, useId, useRef } from 'react';
import { useOverlay } from '../../context/OverlayContext';

export default function NativeModal({ open, onClose, title, subtitle, children }) {
  let overlayCtx = null;
  try {
    overlayCtx = useOverlay();
  } catch (_) {
    overlayCtx = null;
  }
  const internalId = useId();
  const id = `modal-${internalId}`;

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!overlayCtx) return;
    if (open) {
      overlayCtx.openModal({
        id,
        title,
        subtitle,
        content: children,
        onClose: () => {
          if (onCloseRef.current) onCloseRef.current();
        }
      });
    } else {
      overlayCtx.closeOverlay(id);
    }
  }, [open, title, subtitle, children, overlayCtx, id]);

  useEffect(() => {
    if (!overlayCtx) return;
    return () => overlayCtx.closeOverlay(id);
  }, [overlayCtx, id]);

  if (!overlayCtx) {
    if (!open) return null;
    return (
      <div role="dialog">
        {title && <h3>{title}</h3>}
        {children}
      </div>
    );
  }

  return null;
}
