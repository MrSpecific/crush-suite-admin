import { createDecipheriv, createHash } from 'crypto';

/**
 * Decrypts a merchant's `compliancePartnerApiSec`.
 *
 * The main app encrypts it with crypto-js `AES.encrypt(text, passphrase)`, which
 * is OpenSSL's format: base64 of "Salted__" + 8-byte salt + ciphertext, with the
 * key and IV derived by EVP_BytesToKey (MD5, one round). This is not the format
 * `lib/encryption.ts` reads, hence the separate implementation.
 */
export const decryptVinoshipperSecret = (
  encrypted: string,
  passphrase = process.env.VINOSHIPPER_ENCRYPTION_KEY
): string => {
  if (!passphrase) throw new Error('VINOSHIPPER_ENCRYPTION_KEY is not set');

  const data = Buffer.from(encrypted, 'base64');
  if (data.subarray(0, 8).toString('latin1') !== 'Salted__') {
    throw new Error('Vinoshipper secret is not in the expected encrypted format');
  }

  const salt = data.subarray(8, 16);
  const ciphertext = data.subarray(16);
  const { key, iv } = evpBytesToKey(Buffer.from(passphrase, 'utf8'), salt);

  try {
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // A padding failure ("bad decrypt") almost always means the wrong passphrase.
    throw new Error(
      "VINOSHIPPER_ENCRYPTION_KEY doesn't match the key this secret was encrypted with. It must equal the main app's VINOSHIPPER_ENCRYPTION_KEY for this environment"
    );
  }
};

const evpBytesToKey = (password: Buffer, salt: Buffer, keyLength = 32, ivLength = 16) => {
  const blocks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  let length = 0;

  while (length < keyLength + ivLength) {
    previous = createHash('md5').update(Buffer.concat([previous, password, salt])).digest();
    blocks.push(previous);
    length += previous.length;
  }

  const derived = Buffer.concat(blocks);
  return { key: derived.subarray(0, keyLength), iv: derived.subarray(keyLength, keyLength + ivLength) };
};
