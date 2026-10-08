/**
 * ConversationSearch.jsx
 *
 * Real-time fuzzy search bar for chat history.
 */
import React from 'react';
import { Search, X } from 'lucide-react';

export default function ConversationSearch({ value, onChange, onClear }) {
  return (
    <div className="chat-search-bar">
      <Search size={16} className="chat-search-icon" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Search conversations…"
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          className="chat-search-clear-btn"
          onClick={onClear}
          title="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
