import { networkInterfaces } from "node:os";

const BASE_DEV_ORIGINS = [
  "127.0.0.1",
  "::1",
  "[::1]",
  "10.*.*.*",
  "192.168.*.*",
  ...Array.from({ length: 16 }, (_, index) => `172.${16 + index}.*.*`),
];

export function resolveAllowedDevOrigins(
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces(),
): string[] {
  const origins = new Set<string>(BASE_DEV_ORIGINS);

  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === "IPv4" && entry.address) {
        origins.add(entry.address);
      }
    }
  }

  return [...origins];
}
