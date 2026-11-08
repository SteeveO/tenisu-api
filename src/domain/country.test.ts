import { describe, expect, it } from 'vitest';
import { COUNTRIES } from './countries.generated';
import { getCountry } from './country';
import { UnknownCountryError } from './errors';

describe('getCountry', () => {
  it('finds a country whose IOC and ISO codes differ', () => {
    expect(getCountry('SUI')).toEqual({ iocCode: 'SUI', isoCode: 'CH', name: 'Suisse' });
  });

  it('rejects an unknown code with a typed error', () => {
    expect(() => getCountry('XXX')).toThrow(UnknownCountryError);
  });

  it('rejects an ISO code: only IOC codes are accepted', () => {
    expect(() => getCountry('CHE')).toThrow(UnknownCountryError);
  });
});

describe('COUNTRIES', () => {
  it('has unique IOC and ISO codes', () => {
    expect(new Set(COUNTRIES.map((country) => country.iocCode)).size).toBe(COUNTRIES.length);
    expect(new Set(COUNTRIES.map((country) => country.isoCode)).size).toBe(COUNTRIES.length);
  });
});
