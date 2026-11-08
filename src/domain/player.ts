export type Sex = 'M' | 'F';

/** Outcome of a match: 1 is a win, 0 a loss. */
export type MatchResult = 0 | 1;

export interface Player {
  readonly id: number;
  readonly firstname: string;
  readonly lastname: string;
  readonly shortname: string;
  readonly sex: Sex;
  /** IOC code (e.g. SUI). */
  readonly countryCode: string;
  /** Storage key of the picture, null until one is uploaded. Never a full URL. */
  readonly pictureKey: string | null;
  readonly rank: number;
  readonly points: number;
  readonly weightGrams: number;
  readonly heightCm: number;
  readonly age: number;
  readonly lastResults: readonly MatchResult[];
}

/**
 * Sorts players from best to worst: rank first, since points are not comparable
 * across the men's and women's tours, then highest points on equal rank.
 * The id breaks remaining ties so that the order never depends on storage order.
 */
export function sortPlayersFromBestToWorst(players: readonly Player[]): Player[] {
  return players.toSorted((a, b) => a.rank - b.rank || b.points - a.points || a.id - b.id);
}
