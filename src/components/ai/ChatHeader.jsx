import React from 'react';
import { Clock, VolumeX, X } from 'lucide-react';

export default function ChatHeader({
  onToggleSidebar,
  onClose,
}) {
  return (
    <header className="cg-header">
      <div className="cg-header-left">
        <div className="cg-ai-avatar-container">
          {/* We use a placeholder image that matches the requested vibe */}
          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=chef&backgroundColor=transparent" alt="AI Avatar" className="cg-ai-avatar-img" />
          <div className="cg-online-dot"></div>
        </div>
        <div className="cg-header-titles">
          <h1>Cream AI ✨</h1>
          <p>Your Bakery Assistant 🩷</p>
        </div>
      </div>

      <div className="cg-header-right">
        <button
          type="button"
          className="cg-circle-btn"
          title="History"
          onClick={onToggleSidebar}
        >
          <Clock size={16} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          className="cg-circle-btn"
          title="Mute"
        >
          <VolumeX size={16} strokeWidth={2.5} />
        </button>

        {onClose && (
          <button
            type="button"
            className="cg-circle-btn"
            title="Close"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </header>
  );
}
