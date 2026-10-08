/**
 * db/index.js — Repository Layer public API
 *
 * This file is the centralized re-export point for all domain repositories.
 *
 * New code should import directly from the domain repository:
 *   import { addOrderToDB } from '../services/db/OrderRepository';
 *
 * Legacy code that imports from '../services/db' continues to work
 * because the top-level db.js re-exports from this file. No migration
 * of existing callers is required for backwards compatibility.
 *
 * Domain Repositories:
 *   - OrderRepository      → orders/ + ingredient deduction
 *   - CustomerRepository   → customers/ + deduplication
 *   - ProductRepository    → products/
 *   - RecipeRepository     → recipes/
 *   - InventoryRepository  → inventory/
 *   - ExpenseRepository    → expenses/ + storage uploads
 *   - ShoppingRepository   → shoppingList/
 *   - BusinessRepository   → business/ + users/ (menu, portfolio)
 *   - NotificationRepository → notifications/ + FCM
 *   - RecycleBinRepository → cross-collection restore/purge
 */

export * from './OrderRepository.js';
export * from './CustomerRepository.js';
export * from './ProductRepository.js';
export * from './RecipeRepository.js';
export * from './InventoryRepository.js';
export * from './ExpenseRepository.js';
export * from './ShoppingRepository.js';
export * from './BusinessRepository.js';
export * from './NotificationRepository.js';
export * from './RecycleBinRepository.js';
export * from './CommunityRepository.js';
