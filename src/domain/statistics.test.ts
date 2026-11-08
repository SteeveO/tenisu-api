import { describe, expect, it } from 'vitest';
import { aPlayer } from './player.fixtures';
import { computeStatistics } from './statistics';

describe('computeStatistics', () => {
  it('returns null statistics for an empty list', () => {
    expect(computeStatistics([])).toEqual({
      bestCountries: { winRatio: null, countries: [] },
      averageBmi: null,
      medianHeightCm: null,
    });
  });

  describe('bestCountries', () => {
    it('returns the country with the highest win ratio', () => {
      const { bestCountries } = computeStatistics([
        aPlayer({ countryCode: 'FRA', lastResults: [1, 0] }),
        aPlayer({ countryCode: 'ESP', lastResults: [1, 1, 1, 0] }),
      ]);

      expect(bestCountries).toEqual({
        winRatio: 0.75,
        countries: [{ code: 'ESP', wins: 3, matches: 4 }],
      });
    });

    it('sums wins and matches per country instead of averaging player ratios', () => {
      // Per-player ratios would average to (1 + 0.25) / 2 = 0.625 for FRA, beating ESP.
      const { bestCountries } = computeStatistics([
        aPlayer({ countryCode: 'FRA', lastResults: [1] }),
        aPlayer({ countryCode: 'FRA', lastResults: [1, 0, 0, 0] }),
        aPlayer({ countryCode: 'ESP', lastResults: [1, 0] }),
      ]);

      expect(bestCountries).toEqual({
        winRatio: 0.5,
        countries: [{ code: 'ESP', wins: 1, matches: 2 }],
      });
    });

    it('returns all tied countries, ordered by code', () => {
      const { bestCountries } = computeStatistics([
        aPlayer({ countryCode: 'USA', lastResults: [1, 0] }),
        aPlayer({ countryCode: 'ESP', lastResults: [1, 0, 1, 0] }),
      ]);

      expect(bestCountries).toEqual({
        winRatio: 0.5,
        countries: [
          { code: 'ESP', wins: 2, matches: 4 },
          { code: 'USA', wins: 1, matches: 2 },
        ],
      });
    });

    it('treats equal fractions with different denominators as a tie', () => {
      const { bestCountries } = computeStatistics([
        aPlayer({ countryCode: 'FRA', lastResults: [1, 0, 0] }),
        aPlayer({ countryCode: 'ESP', lastResults: [1, 1, 0, 0, 0, 0] }),
      ]);

      expect(bestCountries.countries.map((country) => country.code)).toEqual(['ESP', 'FRA']);
    });

    it('ignores countries without any recorded match', () => {
      const { bestCountries } = computeStatistics([
        aPlayer({ countryCode: 'FRA', lastResults: [] }),
        aPlayer({ countryCode: 'ESP', lastResults: [0] }),
      ]);

      expect(bestCountries).toEqual({
        winRatio: 0,
        countries: [{ code: 'ESP', wins: 0, matches: 1 }],
      });
    });

    it('has no best country when no match is recorded at all', () => {
      const { bestCountries } = computeStatistics([aPlayer({ lastResults: [] })]);

      expect(bestCountries).toEqual({ winRatio: null, countries: [] });
    });
  });

  describe('averageBmi', () => {
    it('converts grams to kilograms and centimeters to meters', () => {
      const { averageBmi } = computeStatistics([aPlayer({ weightGrams: 80000, heightCm: 200 })]);

      expect(averageBmi).toBe(20);
    });

    it('averages the players and rounds to two decimals', () => {
      const { averageBmi } = computeStatistics([
        aPlayer({ weightGrams: 70000, heightCm: 175 }), // 22.857…
        aPlayer({ weightGrams: 75000, heightCm: 180 }), // 23.148…
      ]);

      expect(averageBmi).toBe(23);
    });

    it('rounds the average, not each player', () => {
      const { averageBmi } = computeStatistics([
        aPlayer({ weightGrams: 81000, heightCm: 183 }), // 24.187…
        aPlayer({ weightGrams: 85000, heightCm: 185 }), // 24.835…
      ]);

      expect(averageBmi).toBe(24.51);
    });
  });

  describe('medianHeightCm', () => {
    const withHeights = (...heights: number[]) =>
      computeStatistics(heights.map((heightCm) => aPlayer({ heightCm }))).medianHeightCm;

    it('returns the only height of a single player', () => {
      expect(withHeights(180)).toBe(180);
    });

    it('returns the central value for an odd count, whatever the input order', () => {
      expect(withHeights(190, 170, 180)).toBe(180);
    });

    it('averages the two central values for an even count', () => {
      expect(withHeights(190, 170, 181, 180)).toBe(180.5);
    });
  });
});
