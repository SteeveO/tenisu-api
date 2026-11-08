// Run once: downloads the original photos, normalizes them, and copies the
// flags. The result is committed, so the seed never needs an external server (D23).
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import headToHead from '../assets/headtohead.json';
import { COUNTRIES } from '../src/domain/countries.generated';
import { flagKey } from '../src/domain/image-keys';
import { IMAGES_DIRECTORY, initialPicturePath } from '../src/seed/initial-players';

const MAX_WIDTH = 600;
const MAX_HEIGHT = 900;
const WEBP_QUALITY = 80;

const FLAG_ICONS = fileURLToPath(new URL('../node_modules/flag-icons/', import.meta.url));

async function preparePhoto(playerId: number, url: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download ${url}: ${String(response.status)}`);
  }
  const path = initialPicturePath(playerId);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    // `inside` keeps the whole photo: a crop could cut a player's face.
    await sharp(await response.arrayBuffer())
      .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer(),
  );
}

for (const player of headToHead.players) {
  await preparePhoto(player.id, player.picture);
}

const flagsDirectory = join(IMAGES_DIRECTORY, 'flags');
await mkdir(flagsDirectory, { recursive: true });
await copyFile(join(FLAG_ICONS, 'LICENSE'), join(flagsDirectory, 'LICENSE'));
for (const country of COUNTRIES) {
  const fileName = `${country.isoCode.toLowerCase()}.svg`;
  await copyFile(join(FLAG_ICONS, 'flags/4x3', fileName), join(IMAGES_DIRECTORY, flagKey(country)));
}

console.log(
  `Prepared ${String(headToHead.players.length)} photos, ${String(COUNTRIES.length)} flags`,
);
