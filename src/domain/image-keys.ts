import type { Country } from './country';

/** The hash makes each version of a picture a distinct key, so it can be cached forever. */
export function playerPictureKey(playerId: number, contentHash: string): string {
  return `players/${String(playerId)}/${contentHash}.webp`;
}

export function flagKey(country: Country): string {
  return `flags/${country.isoCode.toLowerCase()}.svg`;
}
