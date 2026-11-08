import { describe, expect, it } from 'vitest';
import headToHead from '../../assets/headtohead.json';
import { getCountry } from './country';
import { sortPlayersFromBestToWorst, type Player } from './player';
import { computeStatistics } from './statistics';

const players: Player[] = headToHead.players.map((raw) => ({
  id: raw.id,
  firstname: raw.firstname,
  lastname: raw.lastname,
  shortname: raw.shortname,
  sex: raw.sex === 'F' ? 'F' : 'M',
  countryCode: raw.country.code,
  pictureKey: null,
  rank: raw.data.rank,
  points: raw.data.points,
  weightGrams: raw.data.weight,
  heightCm: raw.data.height,
  age: raw.data.age,
  lastResults: raw.data.last.map((result) => (result === 1 ? 1 : 0)),
}));

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

  it('only uses known countries', () => {
    for (const player of players) {
      expect(() => getCountry(player.countryCode)).not.toThrow();
    }
  });
});
