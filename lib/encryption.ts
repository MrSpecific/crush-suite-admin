import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto';

// Secret Key
const secretKey = process.env.ENCRYPTION_SECRET_KEY!;

// Key and IV generation
const getKeyAndIV = (secret: string) => {
  const key = scryptSync(secret, 'salt', 32);
  const iv = randomBytes(16);
  return { key, iv };
};

// Encrypt function
export const encrypt = (text: string, secret: string = secretKey): string => {
  const { key, iv } = getKeyAndIV(secret);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

// Decrypt function
export const decrypt = (encryptedText: string, secret: string = secretKey): string => {
  const [ivHex, contentHex] = encryptedText.split(':');
  const { key } = getKeyAndIV(secret);
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(contentHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};
