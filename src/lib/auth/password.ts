import { scrypt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;
const MAX_SCRYPT_MEMORY_BYTES = 128 * 1024 * 1024;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

async function verifyLegacyScryptHash(plaintext: string, encoded: string): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 6) {
    return false;
  }

  const [algorithm, costStr, blockSizeStr, parallelizationStr, saltHex, keyHex] = parts;
  if (algorithm !== "scrypt") {
    return false;
  }

  const cost = Number(costStr);
  const blockSize = Number(blockSizeStr);
  const parallelization = Number(parallelizationStr);

  if (
    !Number.isInteger(cost) ||
    cost < 1024 ||
    cost > 65_536 ||
    (cost & (cost - 1)) !== 0 ||
    !Number.isInteger(blockSize) ||
    blockSize < 1 ||
    blockSize > 16 ||
    !Number.isInteger(parallelization) ||
    parallelization < 1 ||
    parallelization > 8 ||
    saltHex.length % 2 !== 0 ||
    keyHex.length % 2 !== 0 ||
    !/^[0-9a-f]{32,64}$/i.test(saltHex) ||
    !/^[0-9a-f]{64,128}$/i.test(keyHex)
  ) {
    return false;
  }

  const expected = Buffer.from(keyHex, "hex");
  const salt = Buffer.from(saltHex, "hex");

  const actual = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      plaintext,
      salt,
      expected.length,
      { N: cost, r: blockSize, p: parallelization, maxmem: MAX_SCRYPT_MEMORY_BYTES },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  if (hash.startsWith("scrypt$")) {
    return verifyLegacyScryptHash(plaintext, hash);
  }

  return bcrypt.compare(plaintext, hash);
}
