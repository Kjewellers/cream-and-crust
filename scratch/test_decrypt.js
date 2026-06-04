const { webcrypto } = require('crypto');

const SECRET_PASSPHRASE = '20ea3a1dd35acce88e1a498b9c3a7df8';
const EFFECTIVE_PASSPHRASE = SECRET_PASSPHRASE;

async function getCryptoKey(uid = null) {
  const enc = new TextEncoder();
  const salt = uid
    ? `cream-crust-v2-${uid}`
    : 'some-fixed-salt-for-db';

  const keyMaterial = await webcrypto.subtle.importKey(
    "raw",
    enc.encode(EFFECTIVE_PASSPHRASE),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return webcrypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function decryptData(cipherTextStr) {
  if (cipherTextStr.startsWith('ENC2:')) {
    try {
      const rest = cipherTextStr.slice(5);
      const uidLenHex = rest.slice(0, 2);
      const uidLen = parseInt(uidLenHex, 16);
      const uid = rest.slice(3, 3 + uidLen);
      const base64Str = rest.slice(3 + uidLen + 1);

      const binaryStr = atob(base64Str);
      const combined = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) combined[i] = binaryStr.charCodeAt(i);

      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const key = await getCryptoKey(uid || null);
      
      const decryptedBuffer = await webcrypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
      return "ERROR: " + e.message;
    }
  }
}

const cipherStr = "ENC2:00::i9ep+EDjaDX1L3DKU6UlcqKLNJJeSiy+bQd+vE";
// Let's also print the expected key structure
decryptData(cipherStr).then(res => console.log("Decrypted:", res)).catch(console.error);

