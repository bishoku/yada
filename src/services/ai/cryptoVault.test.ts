import { describe, it, expect } from 'vitest';
import { encryptCredential, decryptCredential, isEncrypted } from './cryptoVault';

describe('cryptoVault', () => {
  it('should identify unencrypted vs encrypted strings', () => {
    expect(isEncrypted('')).toBe(false);
    expect(isEncrypted('sk-1234567890abcdef')).toBe(false);
    expect(isEncrypted('enc:v1:0123456789abcdef:fedcba9876543210')).toBe(true);
  });

  it('should encrypt and decrypt plaintext credentials accurately', async () => {
    const plainApiKey = 'sk-or-v1-my-super-secret-openrouter-key-12345';
    const encrypted = await encryptCredential(plainApiKey);

    expect(encrypted).not.toBe(plainApiKey);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(encrypted.startsWith('enc:v1:')).toBe(true);

    const decrypted = await decryptCredential(encrypted);
    expect(decrypted).toBe(plainApiKey);
  });

  it('should handle empty or whitespace-only strings gracefully', async () => {
    expect(await encryptCredential('')).toBe('');
    expect(await encryptCredential('   ')).toBe('');
    expect(await decryptCredential('')).toBe('');
  });

  it('should return unencrypted legacy plaintext unchanged when decrypted', async () => {
    const legacyKey = 'sk-plain-text-key';
    const result = await decryptCredential(legacyKey);
    expect(result).toBe(legacyKey);
  });

  it('should not double-encrypt already encrypted credentials', async () => {
    const plainApiKey = 'sk-test-key-555';
    const encrypted1 = await encryptCredential(plainApiKey);
    const encrypted2 = await encryptCredential(encrypted1);
    expect(encrypted2).toBe(encrypted1);

    const decrypted = await decryptCredential(encrypted2);
    expect(decrypted).toBe(plainApiKey);
  });
});
