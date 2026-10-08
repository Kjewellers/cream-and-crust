import { describe, it, expect } from 'vitest';
import { friendlyError } from '../errorMessages';

describe('friendlyError utility', () => {
  it('maps raw Firebase auth error codes to polished user messages', () => {
    expect(friendlyError({ code: 'auth/invalid-email' })).toBe('Please enter a valid email address.');
    expect(friendlyError({ code: 'auth/invalid-app-credential' })).toBe('Phone verification couldn\'t start. Please try again.');
    expect(friendlyError({ code: 'auth/invalid-verification-code' })).toBe('Incorrect OTP. Please check and try again.');
  });

  it('maps Firebase Firestore errors', () => {
    expect(friendlyError({ code: 'permission-denied' })).toBe('You don\'t have permission to do this.');
    expect(friendlyError({ code: 'unavailable' })).toBe('Service temporarily unavailable. Please try again.');
  });

  it('maps JavaScript runtime errors to generic fallback', () => {
    const typeError = new TypeError("Cannot read properties of undefined (reading 'verificationId')");
    expect(friendlyError(typeError)).toBe('Something went wrong. Please try again.');

    const refError = new ReferenceError('someVariable is not defined');
    expect(friendlyError(refError)).toBe('Something went wrong. Please try again.');
  });

  it('maps generic network errors', () => {
    expect(friendlyError('Failed to fetch')).toBe("Couldn't connect to the server. Check your internet.");
    expect(friendlyError(new Error('NetworkError when attempting to fetch resource.'))).toBe('Network issue. Check your connection and try again.');
  });

  it('returns null for silent cancel errors', () => {
    expect(friendlyError('user cancelled')).toBeNull();
    expect(friendlyError(new Error('The user cancelled the sign-in flow'))).toBeNull();
  });

  it('passes short, user-friendly messages straight through', () => {
    expect(friendlyError('Invalid promo code')).toBe('Invalid promo code');
    expect(friendlyError('Name must be at least 3 characters')).toBe('Name must be at least 3 characters');
  });

  it('defaults to a generic fallback for long or technical messages', () => {
    const longTechnicalMsg = 'TypeError: Cannot read properties of undefined at Object.onClick (App.jsx:1240:22)\n    at callCallback (react-dom.development.js:4164:14)';
    expect(friendlyError(longTechnicalMsg)).toBe('Something went wrong. Please try again.');
  });
});
