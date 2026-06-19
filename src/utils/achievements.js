/**
 * Baker Achievements — milestone definitions + React hook
 *
 * All achievements are computed from data already in DataContext / Profile.
 * No Firestore writes required. Celebration state is tracked in localStorage
 * per-user so confetti only fires once per achievement.
 */

import { useState, useEffect, useRef } from 'react';
import { calculateProfileCompleteness } from './profileFields';

// ─── Achievement Definitions ──────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  {
    id: 'first_bake',
    emoji: '🎂',
    name: 'First Bake',
    desc: 'Completed your very first order',
    tier: 'bronze',
    check: ({ deliveredCount }) => deliveredCount >= 1,
    progress: ({ deliveredCount }) => ({ current: Math.min(deliveredCount, 1), target: 1 }),
  },
  {
    id: 'rising_star',
    emoji: '🌟',
    name: 'Rising Star',
    desc: '10 orders delivered — you\'re on a roll!',
    tier: 'bronze',
    check: ({ deliveredCount }) => deliveredCount >= 10,
    progress: ({ deliveredCount }) => ({ current: Math.min(deliveredCount, 10), target: 10 }),
  },
  {
    id: 'bakery_boss',
    emoji: '🚀',
    name: 'Bakery Boss',
    desc: '50 deliveries under your belt',
    tier: 'silver',
    check: ({ deliveredCount }) => deliveredCount >= 50,
    progress: ({ deliveredCount }) => ({ current: Math.min(deliveredCount, 50), target: 50 }),
  },
  {
    id: 'century_baker',
    emoji: '👑',
    name: 'Century Baker',
    desc: '100 orders completed — legendary!',
    tier: 'gold',
    check: ({ deliveredCount }) => deliveredCount >= 100,
    progress: ({ deliveredCount }) => ({ current: Math.min(deliveredCount, 100), target: 100 }),
  },
  {
    id: 'first_grand',
    emoji: '💸',
    name: 'First Grand',
    desc: 'Earned your first ₹1,000 in revenue',
    tier: 'bronze',
    check: ({ totalRevenue }) => totalRevenue >= 1000,
    progress: ({ totalRevenue }) => ({ current: Math.min(totalRevenue, 1000), target: 1000, prefix: '₹' }),
  },
  {
    id: 'revenue_maker',
    emoji: '💰',
    name: 'Revenue Maker',
    desc: '₹10,000 in total revenue — you\'re thriving!',
    tier: 'silver',
    check: ({ totalRevenue }) => totalRevenue >= 10000,
    progress: ({ totalRevenue }) => ({ current: Math.min(totalRevenue, 10000), target: 10000, prefix: '₹' }),
  },
  {
    id: 'big_earner',
    emoji: '🏆',
    name: 'Big Earner',
    desc: '₹50,000 revenue — elite baker status!',
    tier: 'gold',
    check: ({ totalRevenue }) => totalRevenue >= 50000,
    progress: ({ totalRevenue }) => ({ current: Math.min(totalRevenue, 50000), target: 50000, prefix: '₹' }),
  },
  {
    id: 'community_builder',
    emoji: '👥',
    name: 'Community Builder',
    desc: '10 customers in your book',
    tier: 'bronze',
    check: ({ customersCount }) => customersCount >= 10,
    progress: ({ customersCount }) => ({ current: Math.min(customersCount, 10), target: 10 }),
  },
  {
    id: 'menu_maestro',
    emoji: '🧑‍🍳',
    name: 'Menu Maestro',
    desc: 'Added 5 products to your catalog',
    tier: 'bronze',
    check: ({ productsCount }) => productsCount >= 5,
    progress: ({ productsCount }) => ({ current: Math.min(productsCount, 5), target: 5 }),
  },
  {
    id: 'recipe_master',
    emoji: '📋',
    name: 'Recipe Master',
    desc: 'Built out 5 recipes in your kitchen',
    tier: 'silver',
    check: ({ recipesCount }) => recipesCount >= 5,
    progress: ({ recipesCount }) => ({ current: Math.min(recipesCount, 5), target: 5 }),
  },
  {
    id: 'brand_identity',
    emoji: '📸',
    name: 'Brand Identity',
    desc: 'Uploaded your bakery logo',
    tier: 'bronze',
    check: ({ business }) => !!(business?.logo && business.logo.length > 10),
    progress: ({ business }) => ({ current: business?.logo ? 1 : 0, target: 1 }),
  },
  {
    id: 'ready_for_business',
    emoji: '✅',
    name: 'Ready for Business',
    desc: 'Profile 100% complete — nothing holding you back',
    tier: 'gold',
    check: ({ business }) => calculateProfileCompleteness(business) >= 100,
    progress: ({ business }) => ({
      current: calculateProfileCompleteness(business),
      target: 100,
      suffix: '%',
    }),
  },
];

// ─── Tier colour palettes ─────────────────────────────────────────────────────
export const TIER_STYLES = {
  bronze: {
    bg: 'linear-gradient(135deg, #FFF4ED 0%, #FFE3C9 100%)',
    border: 'rgba(200, 130, 70, 0.25)',
    badge: 'linear-gradient(135deg, #C97A3A 0%, #A0612A 100%)',
    text: '#7A4520',
    glow: 'rgba(200, 130, 70, 0.18)',
  },
  silver: {
    bg: 'linear-gradient(135deg, #F4F6FF 0%, #E8ECFF 100%)',
    border: 'rgba(100, 116, 190, 0.25)',
    badge: 'linear-gradient(135deg, #6474BE 0%, #4455A0 100%)',
    text: '#374080',
    glow: 'rgba(100, 116, 190, 0.18)',
  },
  gold: {
    bg: 'linear-gradient(135deg, #FFFBEA 0%, #FFF3B0 100%)',
    border: 'rgba(210, 165, 30, 0.3)',
    badge: 'linear-gradient(135deg, #D4A000 0%, #B08000 100%)',
    text: '#7A5A00',
    glow: 'rgba(210, 165, 30, 0.22)',
  },
};

// ─── localStorage key helpers ─────────────────────────────────────────────────
const celebratedKey = (uid, id) => `cc_ach_v1:${uid}:${id}`;
const isCelebrated = (uid, id) => {
  try { return localStorage.getItem(celebratedKey(uid, id)) === '1'; } catch { return false; }
};
const markCelebrated = (uid, id) => {
  try { localStorage.setItem(celebratedKey(uid, id), '1'); } catch { /* noop */ }
};

// ─── useAchievements hook ─────────────────────────────────────────────────────
/**
 * @param {object} params
 * @param {any[]}  params.orders      — full orders array from DataContext
 * @param {any[]}  params.customers   — customers array
 * @param {number} params.productsCount
 * @param {number} params.recipesCount
 * @param {object} params.business    — business profile object
 * @param {string} params.uid         — current user UID
 *
 * @returns {{ all: any[], unlocked: any[], locked: any[], newlyUnlocked: any[] }}
 */
export function useAchievements({ orders = [], customers = [], productsCount = 0, recipesCount = 0, business = null, uid = '' }) {
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);
  const prevUnlockedIds = useRef(new Set());

  // Derived stats
  const deliveredCount = orders.filter(o => String(o?.status || '').toLowerCase() === 'delivered').length;
  const totalRevenue = orders
    .filter(o => String(o?.status || '').toLowerCase() !== 'cancelled')
    .reduce((sum, o) => sum + Number(o?.total || o?.totalAmount || 0), 0);
  const customersCount = customers.length;

  const data = { deliveredCount, totalRevenue, customersCount, productsCount, recipesCount, business };

  const all = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: a.check(data),
    progressInfo: a.progress(data),
  }));

  const unlocked = all.filter(a => a.unlocked);
  const locked = all.filter(a => !a.unlocked);

  // Detect newly unlocked achievements (not yet celebrated)
  useEffect(() => {
    if (!uid) return;
    const currentIds = new Set(unlocked.map(a => a.id));
    const justUnlocked = unlocked.filter(
      a => !prevUnlockedIds.current.has(a.id) && !isCelebrated(uid, a.id)
    );

    if (justUnlocked.length > 0) {
      setNewlyUnlocked(justUnlocked);
      justUnlocked.forEach(a => markCelebrated(uid, a.id));
    }

    prevUnlockedIds.current = currentIds;
  }, [unlocked.length, uid]);

  return { all, unlocked, locked, newlyUnlocked };
}
