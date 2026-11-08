import type { NewPlayer, Player } from '../domain/player';

export interface PlayerRepository {
  /** Returns every player, in no particular order. */
  findAll(): Promise<Player[]>;

  /** Returns the player, or null if there is none with this id. */
  findById(id: number): Promise<Player | null>;

  /**
   * Stores a new player and assigns its id.
   * @throws PlayerAlreadyExistsError if a player has the same name (see playerNameKey).
   */
  create(player: NewPlayer): Promise<Player>;
}
