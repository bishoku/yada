/**
 * CryptoVault: Web Crypto API-based credential encryption & key management.
 * Uses hardware/browser-backed AES-GCM (256-bit) to encrypt API keys at rest.
 * Keys are non-extractable from IndexedDB when possible.
 */

const DB_NAME = 'diagramer_crypto_vault';
const STORE_NAME = 'vault_keys';
const KEY_ID = 'device_master_key_v1';
const CIPHER_PREFIX = 'enc:v1:';

let cachedCryptoKey: CryptoKey | null = null;

/**
 * Gets or creates the IndexedDB instance for storing the non-extractable CryptoKey.
 */
function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open vault database.'));
  });
}

/**
 * Loads or generates an AES-GCM 256-bit CryptoKey.
 */
async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) {
    return cachedCryptoKey;
  }

  // Ensure subtle crypto is available (HTTPS / Secure Context)
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not available. Please ensure HTTPS or Secure Context.');
  }

  // Try loading from IndexedDB
  try {
    const db = await openVaultDb();
    const existingKey = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_ID);
      req.onsuccess = () => resolve(req.result as CryptoKey);
      req.onerror = () => reject(req.error);
    });

    if (existingKey) {
      cachedCryptoKey = existingKey;
      return existingKey;
    }

    // Generate a new 256-bit AES-GCM Key (extractable: false for security)
    const newKey = await cryptoObj.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // non-extractable: cannot be exported via exportKey
      ['encrypt', 'decrypt']
    );

    // Save to IndexedDB
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(newKey, KEY_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    cachedCryptoKey = newKey;
    return newKey;
  } catch (err) {
    // If IndexedDB fails (e.g. strict incognito or node testing), generate in-memory key
    const inMemKey = await cryptoObj.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
    cachedCryptoKey = inMemKey;
    return inMemKey;
  }
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Checks if a string is already encrypted in the vault format.
 */
export function isEncrypted(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith(CIPHER_PREFIX);
}

/**
 * Encrypts a plaintext API key or credential using AES-GCM 256-bit.
 * Returns a cipher string in the format `enc:v1:<iv_hex>:<ciphertext_hex>`.
 */
export async function encryptCredential(plainText: string): Promise<string> {
  if (!plainText || !plainText.trim()) return '';
  if (isEncrypted(plainText)) return plainText;

  try {
    const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
    const key = await getOrCreateDeviceKey();

    // 96-bit IV (12 bytes) recommended for AES-GCM
    const iv = cryptoObj.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(plainText.trim());

    const cipherBuffer = await cryptoObj.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedData
    );

    const ivHex = bufferToHex(iv.buffer);
    const cipherHex = bufferToHex(cipherBuffer);

    return `${CIPHER_PREFIX}${ivHex}:${cipherHex}`;
  } catch (err) {
    console.warn('[CryptoVault] Encryption failed, falling back to plaintext:', err);
    return plainText;
  }
}

/**
 * Decrypts a cipher string back to plaintext.
 * If the string is not encrypted (e.g. legacy plaintext), returns it as-is.
 */
export async function decryptCredential(cipherText: string): Promise<string> {
  if (!cipherText || !cipherText.trim()) return '';
  if (!isEncrypted(cipherText)) return cipherText; // Plaintext backward compatibility

  try {
    const cryptoObj = typeof window !== 'undefined' ? window.crypto : (globalThis as any).crypto;
    const raw = cipherText.substring(CIPHER_PREFIX.length);
    const [ivHex, cipherHex] = raw.split(':');

    if (!ivHex || !cipherHex) {
      throw new Error('Malformed encrypted credential format.');
    }

    const key = await getOrCreateDeviceKey();
    const iv = new Uint8Array(hexToBuffer(ivHex));
    const cipherBuffer = hexToBuffer(cipherHex);

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      cipherBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('[CryptoVault] Decryption failed:', err);
    return '';
  }
}
