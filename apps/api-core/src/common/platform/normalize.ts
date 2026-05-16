export function normalizeEmail(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

export function normalizePhone(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = value.trim().replace(/[\s.-]/g, '');
  return normalized || null;
}

export function normalizeUsername(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

export function normalizeTaxCode(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}
