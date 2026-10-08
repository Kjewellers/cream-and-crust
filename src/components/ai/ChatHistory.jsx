/**
 * ChatHistory.jsx — 1:1 ChatGPT Mobile & Web Left Navigation Drawer
 */
import React from 'react';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';

export default function ChatHistory({
  conversations = [],
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClose,
}) {
  return (
    <div className="cg-sidebar-overlay" onClick={onClose}>
      <div className="cg-sidebar" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="cg-sidebar-newchat"
          onClick={() => {
            onNewChat?.();
            onClose?.();
          }}
        >
          <span>New chat</span>
          <Plus size={16} />
        </button>

        <div className="cg-sidebar-history">
          <div className="cg-history-group-title">Today</div>
          {conversations.length === 0 ? (
            <div style={{ padding: '8px', fontSize: '0.82rem', color: '#9B9B9B' }}>
              No history yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className="cg-history-item"
                onClick={() => {
                  onSelectConversation?.(conv.id);
                  onClose?.();
                }}
              >
                {conv.title || 'Untitled chat'}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
