import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;
const parameters = { N: 1 << 16, r: 8, p: 2, maxmem: 128 * 1024 * 1024 };

/** @param {string} password @returns {Promise<string>} */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, keyLength, parameters);
  return ["scrypt", parameters.N, parameters.r, parameters.p, salt.toString("base64url"), Buffer.from(derivedKey).toString("base64url")].join("$");
}

/** @param {string} password @param {string} encodedHash @returns {Promise<boolean>} */
export async function verifyPassword(password, encodedHash) {
  const [algorithm, n, r, p, encodedSalt, encodedKey, extra] = encodedHash.split("$");
  if (algorithm !== "scrypt" || extra !== undefined || Number(n) !== parameters.N || Number(r) !== parameters.r || Number(p) !== parameters.p) return false;

  try {
    const salt = Buffer.from(encodedSalt, "base64url");
    const expectedKey = Buffer.from(encodedKey, "base64url");
    if (salt.length !== 16 || expectedKey.length !== keyLength) return false;
    const derivedKey = Buffer.from(await scrypt(password, salt, keyLength, parameters));
    return timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}
