import { describe, expect, it } from 'vitest';
import headToHead from '../../assets/headtohead.json';
import { sortPlayersFromBestToWorst } from '../domain/player';
import { computeStatistics } from '../domain/statistics';
import { parseInitialPlayers } from './initial-players';

const players = parseInitialPlayers(headToHead);

describe('initial dataset', () => {
  it('computes the expected statistics', () => {
    expect(computeStatistics(players)).toEqual({
      bestCountries: { winRatio: 1, countries: [{ code: 'SRB', wins: 5, matches: 5 }] },
      averageBmi: 23.36,
      medianHeightCm: 185,
    });
  });

  it('sorts players from best to worst', () => {
    expect(sortPlayersFromBestToWorst(players).map((player) => player.lastname)).toEqual([
      'Nadal',
      'Djokovic',
      'Williams',
      'Wawrinka',
      'Williams',
    ]);
  });
});
