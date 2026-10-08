import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, Sparkles } from 'lucide-react';

export default function ChatComposer({
  onSendMessage,
  onStopStreaming,
  isStreaming = false,
  disabled = false,
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!text.trim() || isStreaming || disabled) return;
    const msg = text.trim();
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onSendMessage?.(msg);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="cg-composer-container">
      <form className="cg-composer-pill" onSubmit={handleSend}>
        <button
          type="button"
          className="cg-camera-btn"
          title="Attach photo"
        >
          <Camera size={18} strokeWidth={2.5} />
        </button>

        <div className="cg-input-wrapper">
          <textarea
            ref={textareaRef}
            className="cg-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Cream AI anything..."
            rows={1}
            disabled={disabled || isStreaming}
          />
          <Sparkles size={16} className="cg-sparkle-icon" />
        </div>

        <button
          type="submit"
          className="cg-send-btn"
          title="Send message"
          disabled={!text.trim() || disabled || isStreaming}
        >
          <Send size={16} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
