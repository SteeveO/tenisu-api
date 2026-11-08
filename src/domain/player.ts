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

/** A player as described by a client: the id and the picture are assigned by the system. */
export type NewPlayer = Omit<Player, 'id' | 'pictureKey'>;

/**
 * Identifies a player by name, regardless of case, accents and extra spaces.
 * '#' separates the two names in the key, so it is treated like a space:
 * "a#b c" and "a b#c" must not collide.
 */
export function playerNameKey(firstname: string, lastname: string): string {
  return `${normalizeName(firstname)}#${normalizeName(lastname)}`;
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .toLowerCase()
    .replace(/[\s#]+/g, ' ')
    .trim();
}

/** What locates a player in the sort order. */
export type PlayerPosition = Pick<Player, 'rank' | 'points' | 'id'>;

/**
 * Orders players from best to worst: rank first, since points are not comparable
 * across the men's and women's tours, then highest points on equal rank.
 * The id breaks remaining ties so that the order never depends on storage order.
 */
export function compareFromBestToWorst(a: PlayerPosition, b: PlayerPosition): number {
  return a.rank - b.rank || b.points - a.points || a.id - b.id;
}

export function sortPlayersFromBestToWorst(players: readonly Player[]): Player[] {
  return players.toSorted(compareFromBestToWorst);
}
