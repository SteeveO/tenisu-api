import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { getCountry } from '../domain/country';
import { playerPictureKey } from '../domain/image-keys';
import type { Player } from '../domain/player';
import { toNewPlayer } from '../http/player-presenter';
import { CreatePlayerBodySchema } from '../http/schemas';

const ASSETS_DIRECTORY = fileURLToPath(new URL('../../assets/', import.meta.url));

export const IMAGES_DIRECTORY = join(ASSETS_DIRECTORY, 'images');

// headtohead.json is a system entry like POST /players: same structure, same
// bounds (D34, D36), plus the fields only the original file has.
const initialPlayerSchema = CreatePlayerBodySchema.extend({
  id: z.number().int().positive(),
  country: CreatePlayerBodySchema.shape.country.extend({ picture: z.url() }),
  picture: z.url(),
});

const initialDatasetSchema = z.strictObject({ players: z.array(initialPlayerSchema) });

/** Rejects an invalid value instead of converting it. Picture keys are set by the loader. */
export function parseInitialPlayers(json: unknown): Player[] {
  return initialDatasetSchema.parse(json).players.map((raw) => {
    getCountry(raw.country.code);
    return { ...toNewPlayer(raw), id: raw.id, pictureKey: null };
  });
}

export function initialPicturePath(playerId: number): string {
  return join(IMAGES_DIRECTORY, 'players', `${String(playerId)}.webp`);
}

function contentHash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/** Reads the committed dataset and derives each picture key from the prepared image. */
export async function loadInitialPlayers(): Promise<Player[]> {
  const json: unknown = JSON.parse(
    await readFile(join(ASSETS_DIRECTORY, 'headtohead.json'), 'utf8'),
  );
  return Promise.all(
    parseInitialPlayers(json).map(async (player) => {
      const picture = await readFile(initialPicturePath(player.id));
      return { ...player, pictureKey: playerPictureKey(player.id, contentHash(picture)) };
    }),
  );
}
