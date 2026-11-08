import { COUNTRIES } from '../domain/countries.generated';
import type { Country } from '../domain/country';

const frenchOrder = new Intl.Collator('fr');

// Sorted once: the referential only changes with a deployment.
const countriesByName: readonly Country[] = COUNTRIES.toSorted((a, b) =>
  frenchOrder.compare(a.name, b.name),
);

/** Static data, hence no repository: a plain function is enough. */
export function listCountries(): readonly Country[] {
  return countriesByName;
}
