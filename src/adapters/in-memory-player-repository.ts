import { PlayerAlreadyExistsError } from '../domain/errors';
import { playerNameKey, type NewPlayer, type Player } from '../domain/player';
import type { PlayerRepository } from '../ports/player-repository';

export class InMemoryPlayerRepository implements PlayerRepository {
  private readonly playersById: Map<number, Player>;
  private readonly takenNames: Set<string>;
  private lastId: number;

  constructor(initialPlayers: readonly Player[] = []) {
    this.playersById = new Map(initialPlayers.map((player) => [player.id, player]));
    this.takenNames = new Set(
      initialPlayers.map((player) => playerNameKey(player.firstname, player.lastname)),
    );
    this.lastId = Math.max(0, ...initialPlayers.map((player) => player.id));
  }

  findAll(): Promise<Player[]> {
    return Promise.resolve([...this.playersById.values()]);
  }

  findById(id: number): Promise<Player | null> {
    return Promise.resolve(this.playersById.get(id) ?? null);
  }

  create(newPlayer: NewPlayer): Promise<Player> {
    const nameKey = playerNameKey(newPlayer.firstname, newPlayer.lastname);
    if (this.takenNames.has(nameKey)) {
      return Promise.reject(new PlayerAlreadyExistsError(newPlayer.firstname, newPlayer.lastname));
    }

    this.lastId += 1;
    const player: Player = { ...newPlayer, id: this.lastId, pictureKey: null };
    this.playersById.set(player.id, player);
    this.takenNames.add(nameKey);
    return Promise.resolve(player);
  }
}
