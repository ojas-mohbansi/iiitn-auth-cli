import { encrypt, decrypt } from '../../src/utils/crypto';

describe('encrypt / decrypt', () => {
  it('round-trips a simple string', () => {
    const plaintext = 'hello world';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('round-trips JSON credentials', () => {
    const payload = JSON.stringify({ username: 'testuser', password: 'p@ssw0rd!' });
    expect(decrypt(encrypt(payload))).toBe(payload);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const plaintext = 'same input';
    const c1 = encrypt(plaintext);
    const c2 = encrypt(plaintext);
    expect(c1).not.toBe(c2);
  });

  it('throws on tampered ciphertext', () => {
    const ciphertext = encrypt('data');
    const buf = Buffer.from(ciphertext, 'base64');
    // Flip a byte in the ciphertext body (after 28-byte iv+tag header)
    buf[30] ^= 0xff;
    expect(() => decrypt(buf.toString('base64'))).toThrow();
  });
});
