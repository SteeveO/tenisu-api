import { getCountry } from '../domain/country';
import { PlayerNotFoundError } from '../domain/errors';
import { sortPlayersFromBestToWorst, type NewPlayer, type Player } from '../domain/player';
import { computeStatistics, type PlayerStatistics } from '../domain/statistics';
import type { PlayerRepository } from '../ports/player-repository';

export class PlayerUseCases {
  constructor(private readonly players: PlayerRepository) {}

  async listPlayers(): Promise<Player[]> {
    return sortPlayersFromBestToWorst(await this.players.findAll());
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
