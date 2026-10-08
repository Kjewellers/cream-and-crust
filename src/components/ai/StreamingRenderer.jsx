/**
 * StreamingRenderer.jsx
 *
 * Renders streaming text responses smoothly word-by-word without layout shifts.
 */
import React from 'react';

export default function StreamingRenderer({ text = '', isStreaming = false }) {
  if (!text) return null;

  return (
    <div className="chat-streaming-text">
      <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
      {isStreaming && (
        <span className="chat-streaming-cursor" title="Generating…" />
      )}
    </div>
  );
}
