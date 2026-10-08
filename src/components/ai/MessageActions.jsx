/**
 * MessageActions.jsx
 *
 * Action buttons for messages (Copy, Share, Edit, Regenerate, Retry).
 */
import React, { useState } from 'react';
import { Copy, Check, Share2, Edit2, RotateCcw, AlertTriangle } from 'lucide-react';
import { triggerHaptic } from './ChatTheme';

export default function MessageActions({
  role = 'assistant', // 'user' | 'assistant'
  content = '',
  onCopy,
  onShare,
  onEdit,
  onRegenerate,
  onRetry,
  isError = false,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    triggerHaptic('light');
    navigator.clipboard?.writeText?.(content);
    setCopied(true);
    onCopy?.(content);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    triggerHaptic('light');
    if (navigator.share) {
      navigator.share({ text: content }).catch(() => {});
    } else {
      handleCopy();
    }
    onShare?.(content);
  };

  if (isError) {
    return (
      <div className="chat-msg-actions error">
        <button
          type="button"
          className="chat-msg-action-btn retry"
          onClick={() => {
            triggerHaptic('medium');
            onRetry?.();
          }}
        >
          <RotateCcw size={13} /> Retry
        </button>
        <button type="button" className="chat-msg-action-btn" onClick={handleCopy}>
          {copied ? <Check size={13} /> : <Copy size={13} />} Copy prompt
        </button>
      </div>
    );
  }

  return (
    <div className={`chat-msg-actions ${role}`}>
      <button
        type="button"
        className="chat-msg-action-btn"
        title="Copy text"
        onClick={handleCopy}
      >
        {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      <button
        type="button"
        className="chat-msg-action-btn"
        title="Share"
        onClick={handleShare}
      >
        <Share2 size={13} />
      </button>

      {role === 'user' && onEdit && (
        <button
          type="button"
          className="chat-msg-action-btn"
          title="Edit message"
          onClick={() => {
            triggerHaptic('light');
            onEdit?.(content);
          }}
        >
          <Edit2 size={13} />
        </button>
      )}

      {role === 'assistant' && onRegenerate && (
        <button
          type="button"
          className="chat-msg-action-btn"
          title="Regenerate response"
          onClick={() => {
            triggerHaptic('medium');
            onRegenerate?.();
          }}
        >
          <RotateCcw size={13} />
        </button>
      )}
    </div>
  );
}
