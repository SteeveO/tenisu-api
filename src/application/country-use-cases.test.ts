import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '../domain/countries.generated';
import { listCountries } from './country-use-cases';

describe('listCountries', () => {
  it('returns every country of the referential', () => {
    expect(listCountries()).toHaveLength(COUNTRIES.length);
  });

  it('sorts accented names with their base letter', () => {
    const names = listCountries().map((country) => country.name);

    expect(names.indexOf('Égypte')).toBeLessThan(names.indexOf('Espagne'));
    expect(names.indexOf('Espagne')).toBeLessThan(names.indexOf('Finlande'));
  });
});
