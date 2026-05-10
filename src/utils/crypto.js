const SECRET_PASSPHRASE = 'cream-and-crust-super-secret-key-2026';

// Derive an AES-GCM key from the passphrase
async function getCryptoKey() {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET_PASSPHRASE),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("some-fixed-salt-for-db"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(text) {
  if (!text) return text;
  try {
    const key = await getCryptoKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(String(text))
    );
    
    const encryptedBytes = new Uint8Array(ciphertext);
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv, 0);
    combined.set(encryptedBytes, iv.length);
    
    // Safe base64 encoding for potentially large arrays (though ours are small)
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    
    return 'ENC:' + btoa(binary);
  } catch (e) {
    console.error("Encryption failed", e);
    return text;
  }
}

export async function decryptData(cipherTextStr) {
  if (!cipherTextStr || typeof cipherTextStr !== 'string' || !cipherTextStr.startsWith('ENC:')) {
    return cipherTextStr; // Not encrypted or empty
  }
  
  try {
    const base64Str = cipherTextStr.substring(4);
    const binaryStr = atob(base64Str);
    const combined = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      combined[i] = binaryStr.charCodeAt(i);
    }
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const key = await getCryptoKey();
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );
    
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (e) {
    console.error("Decryption failed", e);
    return cipherTextStr; // Return original if decryption fails
  }
}
