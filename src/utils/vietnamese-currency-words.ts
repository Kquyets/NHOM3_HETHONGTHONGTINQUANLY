/**
 * Utility for converting numerical currency amounts to natural Vietnamese words.
 * Standard accounting practice for Vietnamese invoices, receipts, and contracts.
 * Example: 3500000 -> "Ba triệu năm trăm nghìn đồng"
 */

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readThreeDigits(threeDigits: number, showZeroHundred: boolean): string {
  const hundreds = Math.floor(threeDigits / 100);
  const remainder = threeDigits % 100;
  const tens = Math.floor(remainder / 10);
  const units = remainder % 10;

  const words: string[] = [];

  // Hundreds
  if (hundreds > 0 || showZeroHundred) {
    words.push(`${DIGITS[hundreds]} trăm`);
  }

  // Tens & Units
  if (tens > 1) {
    words.push(`${DIGITS[tens]} mươi`);
    if (units === 1) {
      words.push("mốt");
    } else if (units === 5) {
      words.push("lăm");
    } else if (units > 0) {
      words.push(DIGITS[units]);
    }
  } else if (tens === 1) {
    words.push("mười");
    if (units === 5) {
      words.push("lăm");
    } else if (units > 0) {
      words.push(DIGITS[units]);
    }
  } else if (tens === 0 && units > 0) {
    if (hundreds > 0 || showZeroHundred) {
      words.push("linh");
    }
    words.push(DIGITS[units]);
  }

  return words.join(" ");
}

export function numberToVietnameseWords(amount: number): string {
  const num = Math.round(Math.abs(amount));

  if (num === 0) {
    return "Không đồng";
  }

  // Break into 3-digit groups: [units, thousands, millions, billions]
  const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const groups: number[] = [];
  let temp = num;

  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const resultParts: string[] = [];

  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group === 0) continue;

    // Show zero hundred if it's not the highest non-zero group
    const showZeroHundred = i < groups.length - 1;
    const groupWords = readThreeDigits(group, showZeroHundred);

    if (groupWords) {
      const scale = scales[i];
      resultParts.push(scale ? `${groupWords} ${scale}` : groupWords);
    }
  }

  let finalWords = resultParts.join(" ").trim();
  finalWords = finalWords.charAt(0).toUpperCase() + finalWords.slice(1);

  return `${finalWords} đồng`;
}
