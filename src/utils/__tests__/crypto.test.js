import { describe, it, expect, beforeAll } from 'vitest';
import { encryptData, decryptData } from '../crypto';

describe('crypto data resilience fixes', () => {
  beforeAll(() => {
    if (!globalThis.crypto) {
      const crypto = require('crypto');
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          subtle: crypto.webcrypto.subtle,
          getRandomValues: (arr) => crypto.randomFillSync(arr)
        }
      });
    }
  });

  it('encrypts and decrypts standard data cleanly', async () => {
    const data = "Test Customer Name";
    const uid = "test-uid-123";
    const cipher = await encryptData(data, uid);
    expect(cipher).toMatch(/^ENC2:/);
    
    const decrypted = await decryptData(cipher);
    expect(decrypted).toBe(data);
  });

  it('prevents double encryption on already encrypted strings', async () => {
    const cipherText = "ENC2:00::mockCipherStringData==";
    const uid = "test-uid-123";
    
    const output = await encryptData(cipherText, uid);
    expect(output).toBe(cipherText);
  });
});
