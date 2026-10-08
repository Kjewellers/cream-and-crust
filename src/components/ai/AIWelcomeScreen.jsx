/**
 * AIWelcomeScreen.jsx — 1:1 ChatGPT Mobile & Web Welcome Canvas
 */
import React from 'react';
import { motion } from 'framer-motion';

const PROMPTS = [
  {
    title: 'Create invoice',
    desc: 'Generate bill for customer order',
    prompt: 'Create a new invoice for a chocolate cake order',
  },
  {
    title: 'Eggless cake recipe',
    desc: 'Yield & cost scaling',
    prompt: 'Generate an eggless red velvet cake recipe for 12 servings',
  },
  {
    title: 'Profit margin calculator',
    desc: 'Ingredient costs & markup',
    prompt: 'Calculate profit margin for a ₹1500 cake costing ₹600 in raw ingredients',
  },
  {
    title: 'Draft WhatsApp response',
    desc: 'Polite customer feedback reply',
    prompt: 'Draft a polite WhatsApp reply thanking a customer for a 5-star review',
  },
];

export default function AIWelcomeScreen({ onSelectPrompt }) {
  return (
    <div className="cg-welcome-container">
      <h1 className="cg-welcome-title">What can I help with today?</h1>

      <div className="cg-suggestions-grid">
        {PROMPTS.map((card, i) => (
          <button
            key={i}
            type="button"
            className="cg-suggestion-card"
            onClick={() => onSelectPrompt?.(card.prompt)}
          >
            <h4>{card.title}</h4>
            <p>{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
