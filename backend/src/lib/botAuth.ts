import { createHash } from 'node:crypto';

const PAIRING_CODE_LENGTH = 8;

function randomHex(length: number) {
  return crypto.randomUUID().replace(/-/g, '').slice(0, length).toUpperCase();
}

export function createPairingCode(): string {
  return `SHOT-${randomHex(PAIRING_CODE_LENGTH)}`;
}

export function createConnectorToken(): string {
  return `${crypto.randomUUID()}.${crypto.randomUUID()}`;
}

export function hashBotSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function isPairingCodeValid(bot: {
  pairingCode: string | null;
  pairingCodeExpiresAt: Date | null;
}, code: string): boolean {
  if (!bot.pairingCode || bot.pairingCode !== code.trim().toUpperCase()) return false;
  if (!bot.pairingCodeExpiresAt) return false;
  return bot.pairingCodeExpiresAt.getTime() > Date.now();
}

export function formatDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().split('T')[0] ?? null;
}

export function formatIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}
