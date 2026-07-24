export function serializeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (Array.isArray(value)) {
    return serializeCsvCell(value.map((item) => String(item)).join('; '));
  }
  if (typeof value === 'object') {
    return serializeCsvCell(JSON.stringify(value));
  }
  return serializeCsvCell(String(value));
}

function serializeCsvCell(text: string): string {
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsvDocument(headers: string[], rows: string[][]): string {
  const headerLine = headers.map((header) => serializeCsvCell(header)).join(',');
  const body = rows
    .map((row) => row.map((cell) => serializeCsvCell(cell)).join(','))
    .join('\r\n');
  return `${headerLine}\r\n${body}`;
}
