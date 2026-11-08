import { getCountry } from '../domain/country';
import { flagKey } from '../domain/image-keys';
import type { Player } from '../domain/player';

/** Formats a player for the API: storage keys become public URLs. */
export function presentPlayer(player: Player, cdnBaseUrl: string) {
  const country = getCountry(player.countryCode);
  return {
    id: player.id,
    firstname: player.firstname,
    lastname: player.lastname,
    shortname: player.shortname,
    sex: player.sex,
    country: {
      code: country.iocCode,
      name: country.name,
      picture: `${cdnBaseUrl}/${flagKey(country)}`,
    },
    picture: player.pictureKey === null ? null : `${cdnBaseUrl}/${player.pictureKey}`,
    rank: player.rank,
    points: player.points,
    weightGrams: player.weightGrams,
    heightCm: player.heightCm,
    age: player.age,
    lastResults: [...player.lastResults],
  };
}
