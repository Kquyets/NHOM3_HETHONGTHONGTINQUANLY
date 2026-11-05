type AuthEnvironment = Record<string, string | undefined>;

export function getAuthSecret(env: AuthEnvironment = process.env): Uint8Array {
  const secret = env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes");
  }
  return new TextEncoder().encode(secret);
}
