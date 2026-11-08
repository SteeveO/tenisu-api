import type { Player } from './player';

export function aPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1,
    firstname: 'Test',
    lastname: 'Player',
    shortname: 'T.PLA',
    sex: 'M',
    countryCode: 'FRA',
    pictureKey: null,
    rank: 1,
    points: 1000,
    weightGrams: 80000,
    heightCm: 180,
    age: 30,
    lastResults: [1],
    ...overrides,
  };
}
