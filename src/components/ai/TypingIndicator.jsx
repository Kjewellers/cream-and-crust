/**
 * TypingIndicator.jsx
 *
 * Soft, non-flashy loading indicator matching ChatGPT mobile UI.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function TypingIndicator({ label = 'AI is thinking…' }) {
  return (
    <div className="chat-typing-container">
      <div className="chat-typing-avatar">
        <Sparkles size={14} color="#D4A050" />
      </div>
      <div className="chat-typing-bubble">
        <span className="chat-typing-label">{label}</span>
        <div className="chat-typing-dots">
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
          />
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
          />
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}
