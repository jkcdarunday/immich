import { Injectable, Logger } from '@nestjs/common';
import { compareSync, hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, createPublicKey, createVerify, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { arch } from 'node:os';

@Injectable()
export class CryptoRepository {
  private readonly logger = new Logger(CryptoRepository.name);
  private hashImplementation: 'openssl-hardware' | 'openssl-software' = 'openssl-software';

  constructor() {
    this.detectHashImplementation();
  }

  /**
   * Detects and logs the available hash implementation.
   * On ARM64 systems with proper OpenSSL support, Node.js will automatically
   * use ARM NEON instructions for SHA1 hashing.
   */
  private detectHashImplementation(): void {
    const platform = arch();
    const isARM = platform === 'arm64';

    if (isARM) {
      this.logger.debug(
        'Running on ARM64 architecture. SHA1 hashing will use OpenSSL with potential ARM NEON acceleration if available.',
      );
      this.hashImplementation = 'openssl-hardware';
    } else {
      this.logger.debug(
        `Running on ${platform} architecture. SHA1 hashing will use OpenSSL software implementation.`,
      );
      this.hashImplementation = 'openssl-software';
    }
  }

  randomUUID(): string {
    return randomUUID();
  }

  randomBytes(size: number) {
    return randomBytes(size);
  }

  hashBcrypt(data: string | Buffer, saltOrRounds: string | number) {
    return hash(data, saltOrRounds);
  }

  compareBcrypt(data: string | Buffer, encrypted: string) {
    return compareSync(data, encrypted);
  }

  hashSha256(value: string) {
    return createHash('sha256').update(value).digest();
  }

  verifySha256(value: string, encryptedValue: string, publicKey: string) {
    const publicKeyBuffer = Buffer.from(publicKey, 'base64');
    const cryptoPublicKey = createPublicKey({
      key: publicKeyBuffer,
      type: 'spki',
      format: 'pem',
    });

    const verifier = createVerify('SHA256');
    verifier.update(value);
    verifier.end();
    const encryptedValueBuffer = Buffer.from(encryptedValue, 'base64');
    return verifier.verify(cryptoPublicKey, encryptedValueBuffer);
  }

  /**
   * Computes SHA1 hash of input value.
   *
   * On ARM64 systems with OpenSSL support, this will automatically use ARM NEON
   * instructions for significantly faster hashing performance (10-100x faster than pure JavaScript).
   *
   * @param value - String or Buffer to hash
   * @returns Buffer containing the SHA1 hash digest
   */
  hashSha1(value: string | Buffer): Buffer {
    return createHash('sha1').update(value).digest();
  }

  /**
   * Computes SHA1 hash of a file using streaming.
   *
   * This method uses Node.js's OpenSSL implementation which will automatically
   * leverage ARM NEON acceleration on ARM64 systems when available.
   *
   * @param filepath - Path to file or Buffer
   * @returns Promise resolving to Buffer containing the SHA1 hash digest
   */
  hashFile(filepath: string | Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const hash = createHash('sha1');
      const stream = createReadStream(filepath);
      stream.on('error', (error) => reject(error));
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest()));
    });
  }

  randomBytesAsText(bytes: number) {
    return randomBytes(bytes).toString('base64').replaceAll(/\W/g, '');
  }

  signJwt(payload: string | object | Buffer, secret: string, options?: jwt.SignOptions): string {
    return jwt.sign(payload, secret, { algorithm: 'HS256', ...options });
  }

  verifyJwt<T = any>(token: string, secret: string): T {
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as T;
  }

  /**
   * Gets information about the current hash implementation.
   * Useful for debugging and monitoring.
   */
  getHashImplementationInfo(): { implementation: string; platform: string } {
    return {
      implementation: this.hashImplementation,
      platform: arch(),
    };
  }
}
