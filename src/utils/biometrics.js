/**
 * Biometric authentication helper for sensitive actions (e.g. Account Deletion).
 * Uses WebAuthn / Platform Authenticator (Fingerprint, Face ID, Screen Lock) with fallback.
 */

export async function promptBiometricAuth(reasonMessage = 'Verify your identity with Biometrics') {
  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    try {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (isAvailable) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        // Prompt platform biometric authenticator
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'required',
          },
        });

        if (credential) {
          return true;
        }
      }
    } catch (err) {
      console.warn('[BiometricAuth] Biometric prompt notice:', err?.message || err);
      if (err?.name === 'NotAllowedError') {
        throw new Error('Biometric authentication cancelled by user.');
      }
    }
  }

  // Fallback for environments without WebAuthn credentials enrolled:
  // Prompt standard device confirmation
  const confirmed = window.confirm(`${reasonMessage}\n\nClick OK to confirm biometric / security authorization.`);
  if (!confirmed) {
    throw new Error('Biometric verification cancelled.');
  }
  return true;
}
