import type { Player } from './player';

export interface CountryRecord {
  /** IOC code (e.g. SRB). */
  readonly code: string;
  readonly wins: number;
  readonly matches: number;
}

export interface PlayerStatistics {
  readonly bestCountries: {
    readonly winRatio: number | null;
    readonly countries: readonly CountryRecord[];
  };
  readonly averageBmi: number | null;
  readonly medianHeightCm: number | null;
}

export function computeStatistics(players: readonly Player[]): PlayerStatistics {
  return {
    bestCountries: findBestCountries(players),
    averageBmi: averageBmi(players),
    medianHeightCm: median(players.map((player) => player.heightCm)),
  };
}

/**
 * Ratios are compared with strict equality on purpose: a division is correctly
 * rounded, so two equal fractions (1/3 and 2/6) always yield the same number.
 */
function findBestCountries(players: readonly Player[]): PlayerStatistics['bestCountries'] {
  // A country whose players have no recorded match has no ratio to compare.
  const records = tallyByCountry(players).filter((record) => record.matches > 0);
  if (records.length === 0) {
    return { winRatio: null, countries: [] };
  }

  const bestRatio = Math.max(...records.map(winRatio));
  return {
    winRatio: bestRatio,
    countries: records
      .filter((record) => winRatio(record) === bestRatio)
      .toSorted((a, b) => a.code.localeCompare(b.code)),
  };
}

function tallyByCountry(players: readonly Player[]): CountryRecord[] {
  const tally = new Map<string, { wins: number; matches: number }>();
  for (const { countryCode, lastResults } of players) {
    const current = tally.get(countryCode) ?? { wins: 0, matches: 0 };
    tally.set(countryCode, {
      wins: current.wins + sum(lastResults),
      matches: current.matches + lastResults.length,
    });
  }
  return [...tally].map(([code, record]) => ({ code, ...record }));
}

function winRatio(record: CountryRecord): number {
  return record.wins / record.matches;
}

function averageBmi(players: readonly Player[]): number | null {
  const average = mean(players.map(bodyMassIndex));
  return average === null ? null : Math.round(average * 100) / 100;
}

function bodyMassIndex(player: Player): number {
  const weightKg = player.weightGrams / 1000;
  const heightM = player.heightCm / 100;
  return weightKg / heightM ** 2;
}

function median(values: readonly number[]): number | null {
  const sorted = values.toSorted((a, b) => a - b);
  // One central value for an odd count, the two central values for an even count.
  const lastIndex = sorted.length - 1;
  return mean(sorted.slice(Math.floor(lastIndex / 2), Math.ceil(lastIndex / 2) + 1));
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : sum(values) / values.length;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
