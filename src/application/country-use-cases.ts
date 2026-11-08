import { COUNTRIES } from '../domain/countries.generated';
import type { Country } from '../domain/country';

const frenchOrder = new Intl.Collator('fr');

/** Static data, hence no repository: a plain function is enough. */
export function listCountries(): Country[] {
  return COUNTRIES.toSorted((a, b) => frenchOrder.compare(a.name, b.name));
}
