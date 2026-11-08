import { describe, expect, it } from 'vitest';
import { selectPlayerPage } from './player-page';
import { aPlayer } from './player.fixtures';

const idsOf = (players: readonly { id: number }[]) => players.map((player) => player.id);

const first = aPlayer({ id: 1, rank: 1, sex: 'M', countryCode: 'SRB' });
const second = aPlayer({ id: 2, rank: 2, sex: 'F', countryCode: 'USA' });
const third = aPlayer({ id: 3, rank: 3, sex: 'M', countryCode: 'USA' });
const players = [third, first, second];

describe('selectPlayerPage', () => {
  it('returns an empty last page for no players', () => {
    expect(selectPlayerPage([], { limit: 2 })).toEqual({ players: [], next: null });
  });

  it('returns the best players first', () => {
    expect(idsOf(selectPlayerPage(players, { limit: 2 }).players)).toEqual([1, 2]);
  });

  it('points to the last returned player when more remain', () => {
    expect(selectPlayerPage(players, { limit: 2 }).next).toEqual(second);
  });

  it('has no next page when the limit matches the remaining players exactly', () => {
    expect(selectPlayerPage(players, { limit: 3 }).next).toBeNull();
  });

  it('continues after the given position', () => {
    const page = selectPlayerPage(players, { limit: 2, after: first });

    expect(idsOf(page.players)).toEqual([2, 3]);
    expect(page.next).toBeNull();
  });

  it('is not shifted by a player added before the position', () => {
    const added = aPlayer({ id: 4, rank: 1, points: 99999 });

    expect(
      idsOf(selectPlayerPage([...players, added], { limit: 1, after: first }).players),
    ).toEqual([2]);
  });

  it('filters by sex', () => {
    expect(idsOf(selectPlayerPage(players, { sex: 'F', limit: 10 }).players)).toEqual([2]);
  });

  it('filters by country', () => {
    expect(idsOf(selectPlayerPage(players, { countryCode: 'USA', limit: 10 }).players)).toEqual([
      2, 3,
    ]);
  });

  it('combines filters', () => {
    const page = selectPlayerPage(players, { sex: 'M', countryCode: 'USA', limit: 10 });

    expect(idsOf(page.players)).toEqual([3]);
  });

  it('computes the next page on filtered players only', () => {
    const page = selectPlayerPage(players, { sex: 'M', limit: 1 });

    expect(idsOf(page.players)).toEqual([1]);
    expect(page.next).toEqual(first);
  });
});
