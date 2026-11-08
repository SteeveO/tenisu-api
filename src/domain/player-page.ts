import {
  compareFromBestToWorst,
  sortPlayersFromBestToWorst,
  type Player,
  type PlayerPosition,
  type Sex,
} from './player';

export interface PlayerPageRequest {
  readonly sex?: Sex | undefined;
  readonly countryCode?: string | undefined;
  readonly limit: number;
  /** Position of the last player of the previous page. */
  readonly after?: PlayerPosition | undefined;
}

export interface PlayerPage {
  readonly players: readonly Player[];
  /** Where the next page starts, null on the last page. */
  readonly next: PlayerPosition | null;
}

/**
 * Selects a page by position in the sort order rather than by offset: a player
 * created between two page reads neither repeats nor skips a player.
 */
export function selectPlayerPage(
  players: readonly Player[],
  { sex, countryCode, limit, after }: PlayerPageRequest,
): PlayerPage {
  const remaining = sortPlayersFromBestToWorst(players).filter(
    (player) =>
      (sex === undefined || player.sex === sex) &&
      (countryCode === undefined || player.countryCode === countryCode) &&
      (after === undefined || compareFromBestToWorst(player, after) > 0),
  );

  const page = remaining.slice(0, limit);
  const last = page.at(-1);
  return { players: page, next: remaining.length > limit && last !== undefined ? last : null };
}
