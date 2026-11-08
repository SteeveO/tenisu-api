import { getCountry } from '../domain/country';
import { flagKey } from '../domain/image-keys';
import type { NewPlayer, Player } from '../domain/player';
import type { CreatePlayerBody } from './schemas';

/**
 * Formats a player like the original headtohead.json, the API contract (D36):
 * storage keys become public URLs, and units stay implicit in `data`.
 */
export function presentPlayer(player: Player, cdnBaseUrl: string) {
  return {
    id: player.id,
    firstname: player.firstname,
    lastname: player.lastname,
    shortname: player.shortname,
    sex: player.sex,
    country: {
      picture: `${cdnBaseUrl}/${flagKey(getCountry(player.countryCode))}`,
      code: player.countryCode,
    },
    picture: player.pictureKey === null ? null : `${cdnBaseUrl}/${player.pictureKey}`,
    data: {
      rank: player.rank,
      points: player.points,
      weight: player.weightGrams,
      height: player.heightCm,
      age: player.age,
      last: [...player.lastResults],
    },
  };
}

export function toNewPlayer(body: CreatePlayerBody): NewPlayer {
  return {
    firstname: body.firstname,
    lastname: body.lastname,
    shortname: body.shortname,
    sex: body.sex,
    countryCode: body.country.code,
    rank: body.data.rank,
    points: body.data.points,
    weightGrams: body.data.weight,
    heightCm: body.data.height,
    age: body.data.age,
    lastResults: body.data.last,
  };
}
