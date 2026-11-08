import { describe, expect, it } from 'vitest';
import { PlayerAlreadyExistsError } from '../domain/errors';
import { aNewPlayer, aPlayer } from '../domain/player.fixtures';
import { InMemoryPlayerRepository } from './in-memory-player-repository';
import { describePlayerRepositoryContract } from './player-repository.contract';

describePlayerRepositoryContract('in-memory', () =>
  Promise.resolve(new InMemoryPlayerRepository()),
);

describe('InMemoryPlayerRepository with initial players', () => {
  it('continues numbering after the highest initial id', async () => {
    const repository = new InMemoryPlayerRepository([aPlayer({ id: 102 })]);

    const created = await repository.create(aNewPlayer({ lastname: 'Other' }));

    expect(created.id).toBe(103);
  });

  it('rejects the name of an initial player', async () => {
    const repository = new InMemoryPlayerRepository([
      aPlayer({ firstname: 'Rafael', lastname: 'Nadal' }),
    ]);

    await expect(
      repository.create(aNewPlayer({ firstname: 'Rafael', lastname: 'Nadal' })),
    ).rejects.toThrow(PlayerAlreadyExistsError);
  });
});
