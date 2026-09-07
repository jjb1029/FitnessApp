import { getRandomValues } from 'expo-crypto';

/**
 * UUID v7: time-ordered, random tail. Time ordering keeps SQLite inserts
 * append-friendly and makes ids sortable by creation for sync later.
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  getRandomValues(bytes);

  // 48-bit big-endian unix timestamp in ms.
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;

  // Version 7 in the high nibble of byte 6; variant 10xx in byte 8.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
