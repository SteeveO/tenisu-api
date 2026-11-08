import { getCountry } from '../domain/country';
import { PlayerNotFoundError } from '../domain/errors';
import type { NewPlayer, Player } from '../domain/player';
import { selectPlayerPage, type PlayerPage, type PlayerPageRequest } from '../domain/player-page';
import { computeStatistics, type PlayerStatistics } from '../domain/statistics';
import type { PlayerRepository } from '../ports/player-repository';

export class PlayerUseCases {
  constructor(private readonly players: PlayerRepository) {}

  /** @throws UnknownCountryError */
  async listPlayers(request: PlayerPageRequest): Promise<PlayerPage> {
    if (request.countryCode !== undefined) {
      getCountry(request.countryCode);
    }
    return selectPlayerPage(await this.players.findAll(), request);
  }

  /** @throws PlayerNotFoundError */
  async getPlayer(id: number): Promise<Player> {
    const player = await this.players.findById(id);
    if (player === null) {
      throw new PlayerNotFoundError(id);
    }
    return player;
  }

  async getStatistics(): Promise<PlayerStatistics> {
    return computeStatistics(await this.players.findAll());
  }

  /** @throws UnknownCountryError, PlayerAlreadyExistsError */
  async createPlayer(newPlayer: NewPlayer): Promise<Player> {
    getCountry(newPlayer.countryCode);
    return this.players.create(newPlayer);
  }
}
