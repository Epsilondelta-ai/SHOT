import { createHash } from 'node:crypto';

export function hashBotSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function formatDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().split('T')[0] ?? null;
}

export function formatIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}
