import { beforeEach, describe, expect, it } from 'vitest';
import { PlayerAlreadyExistsError } from '../domain/errors';
import { aNewPlayer } from '../domain/player.fixtures';
import type { PlayerRepository } from '../ports/player-repository';

/** Behaviour every PlayerRepository must honour, whatever its storage. */
export function describePlayerRepositoryContract(
  implementation: string,
  createRepository: () => Promise<PlayerRepository>,
): void {
  describe(`PlayerRepository contract: ${implementation}`, () => {
    let repository: PlayerRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it('starts empty', async () => {
      await expect(repository.findAll()).resolves.toEqual([]);
    });

    it('returns null for an unknown id', async () => {
      await expect(repository.findById(999)).resolves.toBeNull();
    });

    it('assigns an id and no picture on creation', async () => {
      const newPlayer = aNewPlayer();

      const { id, ...stored } = await repository.create(newPlayer);

      expect(id).toBeGreaterThan(0);
      expect(stored).toEqual({ ...newPlayer, pictureKey: null });
    });

    it('finds a created player by id, with all its attributes', async () => {
      const created = await repository.create(aNewPlayer({ lastResults: [1, 0, 1] }));

      await expect(repository.findById(created.id)).resolves.toEqual(created);
    });

    it('keeps an empty match history', async () => {
      const created = await repository.create(aNewPlayer({ lastResults: [] }));

      await expect(repository.findById(created.id)).resolves.toEqual(created);
    });

    it('lists only players, without technical records', async () => {
      const first = await repository.create(aNewPlayer({ lastname: 'One' }));
      const second = await repository.create(aNewPlayer({ lastname: 'Two' }));

      const players = await repository.findAll();

      expect(players).toHaveLength(2);
      expect(players).toEqual(expect.arrayContaining([first, second]));
    });

    it('assigns a new id to each player', async () => {
      const first = await repository.create(aNewPlayer({ lastname: 'One' }));
      const second = await repository.create(aNewPlayer({ lastname: 'Two' }));

      expect(second.id).not.toBe(first.id);
    });

    it('rejects a player with the same name', async () => {
      await repository.create(aNewPlayer({ firstname: 'Novak', lastname: 'Djokovic' }));

      await expect(
        repository.create(aNewPlayer({ firstname: 'Novak', lastname: 'Djokovic' })),
      ).rejects.toThrow(PlayerAlreadyExistsError);
    });

    it('rejects the same name written with another case, accents or spaces', async () => {
      await repository.create(aNewPlayer({ firstname: 'Gaël', lastname: 'Monfils' }));

      await expect(
        repository.create(aNewPlayer({ firstname: ' GAEL ', lastname: 'monfils' })),
      ).rejects.toThrow(PlayerAlreadyExistsError);
    });

    it('does not store a rejected player', async () => {
      await repository.create(aNewPlayer());

      await expect(repository.create(aNewPlayer())).rejects.toThrow(PlayerAlreadyExistsError);

      await expect(repository.findAll()).resolves.toHaveLength(1);
    });

    it('gives different ids to concurrent creations', async () => {
      const creations = Array.from({ length: 10 }, (_, index) =>
        repository.create(aNewPlayer({ lastname: `Player ${String(index)}` })),
      );

      const players = await Promise.all(creations);

      expect(new Set(players.map((player) => player.id)).size).toBe(10);
      await expect(repository.findAll()).resolves.toHaveLength(10);
    });

    it('accepts only one of several concurrent creations of the same name', async () => {
      const creations = Array.from({ length: 5 }, () => repository.create(aNewPlayer()));

      const results = await Promise.allSettled(creations);

      const rejected = results.filter((result) => result.status === 'rejected');
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(rejected).toHaveLength(4);
      for (const { reason } of rejected) {
        expect(reason).toBeInstanceOf(PlayerAlreadyExistsError);
      }
      await expect(repository.findAll()).resolves.toHaveLength(1);
    });
  });
}
