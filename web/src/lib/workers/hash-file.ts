import { sha1 as sha1Wasm } from 'hash-wasm';
import { sha1 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';

const HASH_CHUNK_SIZE = 5 * 1024 * 1024;
let wasmSupported = false;
let hasher: any = null;

/**
 * Initialize WebAssembly SHA1 hasher on worker load.
 * Falls back to noble/hashes if WebAssembly is unavailable.
 */
async function initializeHasher(): Promise<void> {
  try {
    hasher = await sha1Wasm();
    wasmSupported = true;
    console.debug('SHA1 hasher: WebAssembly initialized');
  } catch (error) {
    console.debug('SHA1 hasher: WebAssembly unavailable, using JavaScript fallback', error);
    wasmSupported = false;
  }
}

/**
 * Compute file hash using WebAssembly if available, otherwise use pure JavaScript.
 * WebAssembly provides significant performance improvements on all platforms
 * and can leverage browser JIT compilation for optimal performance.
 *
 * @param file - File to hash
 * @returns Promise resolving to hex string of SHA1 hash
 */
async function hashFileWasm(file: File): Promise<string> {
  if (!wasmSupported || !hasher) {
    return hashFileJavaScript(file);
  }

  try {
    hasher.init();

    for (let offset = 0; offset < file.size; offset += HASH_CHUNK_SIZE) {
      const slice = file.slice(offset, Math.min(offset + HASH_CHUNK_SIZE, file.size));
      const buffer = await slice.arrayBuffer();
      hasher.update(new Uint8Array(buffer));
    }

    return hasher.digest('hex');
  } catch (error) {
    console.warn('WebAssembly hashing failed, falling back to JavaScript', error);
    return hashFileJavaScript(file);
  }
}

/**
 * Compute file hash using pure JavaScript implementation.
 * Used as fallback when WebAssembly is unavailable.
 *
 * @param file - File to hash
 * @returns Promise resolving to hex string of SHA1 hash
 */
async function hashFileJavaScript(file: File): Promise<string> {
  const hasherJs = sha1.create();

  for (let offset = 0; offset < file.size; offset += HASH_CHUNK_SIZE) {
    const slice = file.slice(offset, Math.min(offset + HASH_CHUNK_SIZE, file.size));
    const buffer = await slice.arrayBuffer();
    hasherJs.update(new Uint8Array(buffer));
  }

  return bytesToHex(hasherJs.digest());
}

/**
 * Main hash function - attempts WebAssembly first, falls back to JavaScript.
 *
 * @param file - File to hash
 * @returns Promise resolving to hex string of SHA1 hash
 */
async function hashFile(file: File): Promise<string> {
  if (!wasmSupported) {
    return hashFileJavaScript(file);
  }
  return hashFileWasm(file);
}

addEventListener('message', (event: MessageEvent<File>) => {
  void hashFile(event.data)
    .then((result) => {
      postMessage({
        result,
        implementation: wasmSupported ? 'wasm' : 'javascript',
      });
    })
    .catch((error: unknown) => {
      postMessage({
        error: error instanceof Error ? error.message : String(error),
      });
    });
});

// Initialize on worker load
void initializeHasher();
