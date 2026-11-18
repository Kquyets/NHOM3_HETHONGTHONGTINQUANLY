import type { NetworkInterfaceInfo } from "node:os";
import { describe, expect, it } from "vitest";

import { resolveAllowedDevOrigins } from "./dev-origins";

function mockIPv4(address: string, internal = false): NetworkInterfaceInfo {
  return {
    address,
    netmask: "255.255.255.0",
    family: "IPv4",
    mac: "00:00:00:00:00:00",
    internal,
    cidr: `${address}/24`,
  };
}

function mockIPv6(address: string, internal = false): NetworkInterfaceInfo {
  return {
    address,
    netmask: "ffff:ffff:ffff:ffff::",
    family: "IPv6",
    mac: "00:00:00:00:00:00",
    internal,
    scopeid: 0,
    cidr: `${address}/64`,
  };
}

describe("resolveAllowedDevOrigins", () => {
  it("includes loopback, RFC1918 LAN wildcards, and detected IPv4 adapter addresses", () => {
    const origins = resolveAllowedDevOrigins({
      lo: [mockIPv4("127.0.0.1", true), mockIPv6("::1", true)],
      eth0: [mockIPv4("10.1.4.6", false), mockIPv6("fe80::1", false)],
      wlan0: [mockIPv4("192.168.1.42", false)],
    });

    expect(origins).toContain("127.0.0.1");
    expect(origins).toContain("10.*.*.*");
    expect(origins).toContain("192.168.*.*");
    expect(origins).toContain("172.16.*.*");
    expect(origins).toContain("172.31.*.*");
    expect(origins).toContain("10.1.4.6");
    expect(origins).toContain("192.168.1.42");
    expect(origins).not.toContain("172.15.*.*");
    expect(origins).not.toContain("172.32.*.*");
  });

  it("deduplicates duplicate interface addresses", () => {
    const origins = resolveAllowedDevOrigins({
      lo: [mockIPv4("127.0.0.1", true)],
      lo2: [mockIPv4("127.0.0.1", true)],
    });

    expect(origins.filter((origin) => origin === "127.0.0.1")).toHaveLength(1);
  });
});
