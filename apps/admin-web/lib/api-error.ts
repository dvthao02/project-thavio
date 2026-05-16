import axios from 'axios';

function normalizeMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const parts = value.map((item) => normalizeMessage(item)).filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nested = normalizeMessage(record.message);
    if (nested) return nested;

    const path = Array.isArray(record.path) ? record.path.join('.') : null;
    if (typeof record.code === 'string' && path) {
      return `${path} không hợp lệ.`;
    }
  }

  return null;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return (
      normalizeMessage(error.response?.data?.message) ??
      normalizeMessage(error.response?.data?.error) ??
      fallback
    );
  }

  return normalizeMessage(error) ?? fallback;
}
