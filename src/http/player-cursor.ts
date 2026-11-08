import { z } from '@hono/zod-openapi';
import type { PlayerPosition } from '../domain/player';

const positionSchema = z.tuple([z.number().int(), z.number().int(), z.number().int()]);

/** Opaque for clients: the format can change without breaking the contract. */
export function encodeCursor({ rank, points, id }: PlayerPosition): string {
  return Buffer.from(JSON.stringify([rank, points, id])).toString('base64url');
}

/** Returns null for anything that is not a cursor issued by this API. */
export function decodeCursor(cursor: string): PlayerPosition | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());
  } catch {
    return null;
  }
  const parsed = positionSchema.safeParse(decoded);
  if (!parsed.success) {
    return null;
  }
  const [rank, points, id] = parsed.data;
  return { rank, points, id };
}
