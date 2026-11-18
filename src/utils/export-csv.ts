/**
 * Utilities for formatting and exporting table data to CSV with UTF-8 BOM
 * for perfect Vietnamese diacritic support in Microsoft Excel.
 */

export function sanitizeCsvField(field: unknown): string {
  if (field === null || field === undefined) {
    return '""';
  }
  const str = String(field).trim();
  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  // Always wrap in quotes to safely handle commas, newlines, semicolons
  return `"${escaped}"`;
}

export function generateCsvContent(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const headerLine = headers.map(sanitizeCsvField).join(",");
  const rowLines = rows.map((row) => row.map(sanitizeCsvField).join(","));
  // \uFEFF is the UTF-8 BOM prefix
  return "\uFEFF" + [headerLine, ...rowLines].join("\r\n");
}

export function downloadCsvFile(filename: string, content: string): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTableToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): void {
  const content = generateCsvContent(headers, rows);
  downloadCsvFile(filename, content);
}
