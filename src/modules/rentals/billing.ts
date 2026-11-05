function thousandths(value: string): bigint {
  const match = value.match(/^(\d+)(?:\.(\d{1,3}))?$/);
  if (!match) throw new RangeError("Meter reading must have at most three decimal places.");
  return BigInt(match[1]) * BigInt(1000) + BigInt((match[2] ?? "").padEnd(3, "0") || "0");
}

export function calculateUtilityAmount(previousValue: string, currentValue: string, unitPrice: number): number {
  const usage = thousandths(currentValue) - thousandths(previousValue);
  if (usage < BigInt(0) || !Number.isSafeInteger(unitPrice) || unitPrice < 0) {
    throw new RangeError("Utility usage and price must be nonnegative.");
  }
  const amount = Number((usage * BigInt(unitPrice) + BigInt(500)) / BigInt(1000));
  if (!Number.isSafeInteger(amount)) throw new RangeError("Calculated amount exceeds the supported VND range.");
  return amount;
}
