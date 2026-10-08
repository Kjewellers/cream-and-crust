import React from 'react';
import StreamingRenderer from './StreamingRenderer';
import BirthdayCakeOrderWidget from './BirthdayCakeOrderWidget';

export default function ChatBubble({
  message,
}) {
  const { role = 'assistant', text = '', isStreaming = false } = message;
  const isUser = role === 'user';
  
  // Extract time from the ID (which includes a timestamp like user_172209... or ai_172209...)
  // Or just mock a static time for the demo like the screenshot "9:41 AM"
  const timestamp = '9:41 AM';

  // Check if the AI wants to render a special widget
  const hasCakeWidget = !isUser && text.includes('[WIDGET:BIRTHDAY_CAKE]');
  const cleanText = text.replace('[WIDGET:BIRTHDAY_CAKE]', '').trim();

  return (
    <div className={`cg-message ${role}`}>
      {!isUser && (
        <div className="cg-small-avatar">
          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=chef&backgroundColor=transparent" alt="Cream AI" />
        </div>
      )}

      <div className="cg-message-body">
        <StreamingRenderer text={cleanText} isStreaming={isStreaming} />
        
        {hasCakeWidget && <BirthdayCakeOrderWidget />}

        <div className="cg-msg-meta">
          <span>{timestamp}</span>
          {isUser && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
              <path d="M18 6 7 17l-5-5"/>
              <path d="m22 10-7.5 7.5L13 16"/>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
