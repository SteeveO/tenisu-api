import { COUNTRIES } from './countries.generated';
import { UnknownCountryError } from './errors';

export interface Country {
  /** IOC code, as found in tennis data (e.g. SUI). */
  readonly iocCode: string;
  /** ISO 3166-1 alpha-2 code, which identifies the flag (e.g. CH). */
  readonly isoCode: string;
  /** French name (e.g. Suisse). */
  readonly name: string;
}

const countriesByIocCode = new Map(COUNTRIES.map((country) => [country.iocCode, country]));

export function getCountry(iocCode: string): Country {
  const country = countriesByIocCode.get(iocCode);
  if (country === undefined) {
    throw new UnknownCountryError(iocCode);
  }
  return country;
}
