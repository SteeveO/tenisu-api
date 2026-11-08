import type { Country } from '../domain/country';
import { flagKey } from '../domain/image-keys';

/** `code` and `picture` are named as in a player's `country` (D36, D41). */
export function presentCountry(country: Country, cdnBaseUrl: string) {
  return {
    code: country.iocCode,
    name: country.name,
    picture: `${cdnBaseUrl}/${flagKey(country)}`,
  };
}
