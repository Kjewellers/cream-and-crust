import React from 'react';
import { ChevronDown, MessageSquare, User, Calendar, Type, Maximize } from 'lucide-react';
import './AIChat.css';

export default function BirthdayCakeOrderWidget() {
  return (
    <div className="cg-widget-card">
      <div className="cg-widget-header">
        <div className="cg-widget-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>
            <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/>
            <path d="M2 21h20"/>
            <path d="M7 8v2"/>
            <path d="M12 8v2"/>
            <path d="M17 8v2"/>
            <path d="M7 4h.01"/>
            <path d="M12 4h.01"/>
            <path d="M17 4h.01"/>
          </svg>
        </div>
        <div className="cg-widget-title">
          <h3>Birthday Cake Order</h3>
          <p>Let's customize the perfect cake!</p>
        </div>
      </div>

      <div className="cg-widget-row">
        <div className="cg-widget-row-left">
          <Type size={16} className="cg-widget-row-icon" />
          <span>Cake Flavor</span>
        </div>
        <ChevronDown size={16} className="cg-widget-row-icon" />
      </div>

      <div className="cg-widget-row">
        <div className="cg-widget-row-left">
          <Maximize size={16} className="cg-widget-row-icon" />
          <span>Size</span>
        </div>
        <ChevronDown size={16} className="cg-widget-row-icon" />
      </div>

      <div className="cg-widget-row">
        <div className="cg-widget-row-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cg-widget-row-icon">
            <path d="M10.273 5.009a4.442 4.442 0 0 1 4.453-4.453c.642 0 1.25.132 1.821.369a4.442 4.442 0 0 1-6.274 4.084z" />
            <path d="m14 15 4 4" />
            <path d="m14 9 4-4" />
            <path d="m14 10-2-2" />
            <path d="m16 8 2 2" />
            <path d="M21 4 3 22" />
          </svg>
          <span>Design / Theme</span>
        </div>
        <ChevronDown size={16} className="cg-widget-row-icon" />
      </div>

      <div className="cg-widget-row">
        <div className="cg-widget-row-left">
          <User size={16} className="cg-widget-row-icon" />
          <span>Recipient Name</span>
        </div>
        <ChevronDown size={16} className="cg-widget-row-icon" />
      </div>

      <div className="cg-widget-row">
        <div className="cg-widget-row-left">
          <Calendar size={16} className="cg-widget-row-icon" />
          <span>Delivery Date</span>
        </div>
        <ChevronDown size={16} className="cg-widget-row-icon" />
      </div>

      <div className="cg-widget-row">
        <div className="cg-widget-row-left">
          <MessageSquare size={16} className="cg-widget-row-icon" />
          <span>Any Special Requests?</span>
        </div>
        <ChevronDown size={16} className="cg-widget-row-icon" />
      </div>
    </div>
  );
}
