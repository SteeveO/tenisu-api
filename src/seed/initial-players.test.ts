import { describe, expect, it } from 'vitest';
import { UnknownCountryError } from '../domain/errors';
import { parseInitialPlayers } from './initial-players';

const validData = { rank: 2, points: 2542, weight: 80000, height: 188, age: 31, last: [1, 0] };

const rawPlayer = (overrides: Record<string, unknown> = {}) => ({
  id: 52,
  firstname: 'Novak',
  lastname: 'Djokovic',
  shortname: 'N.DJO',
  sex: 'M',
  country: { picture: 'https://example.com/flag.png', code: 'SRB' },
  picture: 'https://example.com/photo.png',
  data: validData,
  ...overrides,
});

const parse = (player: unknown) => parseInitialPlayers({ players: [player] });

describe('parseInitialPlayers', () => {
  it('converts a raw player into a domain player', () => {
    expect(parse(rawPlayer())).toEqual([
      {
        id: 52,
        firstname: 'Novak',
        lastname: 'Djokovic',
        shortname: 'N.DJO',
        sex: 'M',
        countryCode: 'SRB',
        pictureKey: null,
        rank: 2,
        points: 2542,
        weightGrams: 80000,
        heightCm: 188,
        age: 31,
        lastResults: [1, 0],
      },
    ]);
  });

  it.each([
    ['an unknown sex', { sex: 'X' }],
    ['a match result other than 0 or 1', { data: { ...validData, last: [2] } }],
    ['a height of 0', { data: { ...validData, height: 0 } }],
    ['an implausible weight', { data: { ...validData, weight: 80 } }],
    ['a missing id', { id: undefined }],
    ['an unknown field', { nickname: 'Nole' }],
  ])('rejects %s', (_label, overrides) => {
    expect(() => parse(rawPlayer(overrides))).toThrow();
  });

  it('rejects an unknown country', () => {
    const player = rawPlayer({ country: { picture: 'https://example.com/f.png', code: 'XXX' } });

    expect(() => parse(player)).toThrow(UnknownCountryError);
  });
});
