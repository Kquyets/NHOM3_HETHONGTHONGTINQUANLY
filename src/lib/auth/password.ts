import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const cost = 32_768;
const blockSize = 8;
const parallelization = 1;
const keyLength = 64;
const maxMemory = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { N: cost, r: blockSize, p: parallelization, maxmem: maxMemory }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${cost}$${blockSize}$${parallelization}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, storedCost, storedBlockSize, storedParallelization, saltHex, keyHex, extra] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    Number(storedCost) !== cost ||
    Number(storedBlockSize) !== blockSize ||
    Number(storedParallelization) !== parallelization ||
    extra !== undefined ||
    !/^[0-9a-f]{32}$/i.test(saltHex ?? "") ||
    !/^[0-9a-f]{128}$/i.test(keyHex ?? "")
  ) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actual, expected);
}
