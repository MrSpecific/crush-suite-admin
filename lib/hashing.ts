import { randomBytes, pbkdf2Sync } from 'crypto';

export const hash = (input: string): string => {
  const salt = randomBytes(16).toString('hex');
  const iterations = 10000; // Number of iterations
  const hash = pbkdf2Sync(input, salt, iterations, 64, 'sha512').toString('hex');
  return `${iterations}.${salt}.${hash}`;
};

export const verifyHash = (password: string, storedHash: string): boolean => {
  const [iterations, salt, originalHash] = storedHash.split('.');
  const hash = pbkdf2Sync(password, salt, parseInt(iterations, 10), 64, 'sha512').toString('hex');
  return hash === originalHash;
};
