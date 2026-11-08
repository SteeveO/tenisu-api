import { describe, expect, it } from 'vitest';
import { InMemoryPlayerRepository } from '../adapters/in-memory-player-repository';
import {
  PlayerAlreadyExistsError,
  PlayerNotFoundError,
  UnknownCountryError,
} from '../domain/errors';
import { aNewPlayer, aPlayer } from '../domain/player.fixtures';
import { PlayerUseCases } from './player-use-cases';

describe('PlayerUseCases', () => {
  it('lists players from best to worst', async () => {
    const useCases = new PlayerUseCases(
      new InMemoryPlayerRepository([
        aPlayer({ id: 1, lastname: 'Second', rank: 2 }),
        aPlayer({ id: 2, lastname: 'First', rank: 1 }),
      ]),
    );

    const players = await useCases.listPlayers();

    expect(players.map((player) => player.lastname)).toEqual(['First', 'Second']);
  });

  it('returns a player by id', async () => {
    const player = aPlayer({ id: 7 });
    const useCases = new PlayerUseCases(new InMemoryPlayerRepository([player]));

    await expect(useCases.getPlayer(7)).resolves.toEqual(player);
  });

  it('fails with a typed error for an unknown player', async () => {
    const useCases = new PlayerUseCases(new InMemoryPlayerRepository());

    await expect(useCases.getPlayer(999)).rejects.toThrow(PlayerNotFoundError);
  });

  it('computes statistics from all players', async () => {
    const useCases = new PlayerUseCases(new InMemoryPlayerRepository([aPlayer({ heightCm: 190 })]));

    const statistics = await useCases.getStatistics();

    expect(statistics.medianHeightCm).toBe(190);
  });

  it('creates a player', async () => {
    const useCases = new PlayerUseCases(new InMemoryPlayerRepository());

    const created = await useCases.createPlayer(aNewPlayer());

    await expect(useCases.getPlayer(created.id)).resolves.toEqual(created);
  });

  it('refuses an unknown country and stores nothing', async () => {
    const useCases = new PlayerUseCases(new InMemoryPlayerRepository());

    await expect(useCases.createPlayer(aNewPlayer({ countryCode: 'XXX' }))).rejects.toThrow(
      UnknownCountryError,
    );

    await expect(useCases.listPlayers()).resolves.toEqual([]);
  });

  it('refuses a duplicate player', async () => {
    const useCases = new PlayerUseCases(new InMemoryPlayerRepository());
    await useCases.createPlayer(aNewPlayer());

    await expect(useCases.createPlayer(aNewPlayer())).rejects.toThrow(PlayerAlreadyExistsError);
  });
});
