import { describe, expect, it } from 'vitest';
import { playerNameKey, sortPlayersFromBestToWorst } from './player';
import { aPlayer } from './player.fixtures';

const idsOf = (players: readonly { id: number }[]) => players.map((player) => player.id);

describe('sortPlayersFromBestToWorst', () => {
  it('returns an empty list for no players', () => {
    expect(sortPlayersFromBestToWorst([])).toEqual([]);
  });

  it('sorts by ascending rank, whatever the points', () => {
    const sorted = sortPlayersFromBestToWorst([
      aPlayer({ id: 1, rank: 3, points: 9000 }),
      aPlayer({ id: 2, rank: 1, points: 10 }),
      aPlayer({ id: 3, rank: 2, points: 500 }),
    ]);

    expect(idsOf(sorted)).toEqual([2, 3, 1]);
  });

  it('puts the highest points first on equal rank', () => {
    const sorted = sortPlayersFromBestToWorst([
      aPlayer({ id: 1, rank: 1, points: 100 }),
      aPlayer({ id: 2, rank: 1, points: 300 }),
    ]);

    expect(idsOf(sorted)).toEqual([2, 1]);
  });

  it('orders by id on equal rank and points, so the result is deterministic', () => {
    const sorted = sortPlayersFromBestToWorst([aPlayer({ id: 9 }), aPlayer({ id: 4 })]);

    expect(idsOf(sorted)).toEqual([4, 9]);
  });

  it('does not mutate the given list', () => {
    const players = [aPlayer({ id: 1, rank: 2 }), aPlayer({ id: 2, rank: 1 })];

    sortPlayersFromBestToWorst(players);

    expect(idsOf(players)).toEqual([1, 2]);
  });
});

describe('playerNameKey', () => {
  it('builds a key from both names', () => {
    expect(playerNameKey('Novak', 'Djokovic')).toBe('novak#djokovic');
  });

  it('ignores case, accents and extra spaces', () => {
    expect(playerNameKey('  JO-Wilfried ', 'Tsonga')).toBe(playerNameKey('jo-wilfried', 'tsonga'));
    expect(playerNameKey('Gaël', 'Monfils')).toBe(playerNameKey('Gael', 'Monfils'));
    expect(playerNameKey('Juan  Martin', 'del Potro')).toBe(
      playerNameKey('Juan Martin', 'del  Potro'),
    );
  });

  it('keeps distinct names distinct', () => {
    expect(playerNameKey('Venus', 'Williams')).not.toBe(playerNameKey('Serena', 'Williams'));
  });

  it('cannot be confused by a separator inside a name', () => {
    expect(playerNameKey('a#b', 'c')).not.toBe(playerNameKey('a', 'b#c'));
  });
});
