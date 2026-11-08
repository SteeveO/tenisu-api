import { randomUUID } from 'node:crypto';
import { CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlayerAlreadyExistsError } from '../domain/errors';
import { aNewPlayer, aPlayer } from '../domain/player.fixtures';
import { createDynamoDbLocalClient } from './dynamodb-local.fixtures';
import { DynamoDbPlayerRepository } from './dynamodb-player-repository';
import { seedPlayers } from './dynamodb-player-seed';
import { playersTableDefinition } from './dynamodb-table';

const client = createDynamoDbLocalClient();
const documentClient = DynamoDBDocumentClient.from(client);

const initialPlayers = [
  aPlayer({ id: 52, firstname: 'Novak', lastname: 'Djokovic' }),
  aPlayer({ id: 102, firstname: 'Rafael', lastname: 'Nadal' }),
];

describe('seedPlayers', () => {
  let tableName: string;
  let repository: DynamoDbPlayerRepository;

  const seed = () => seedPlayers(documentClient, tableName, initialPlayers);
  const createPlayer = (firstname: string) =>
    repository.create(aNewPlayer({ firstname, lastname: 'Created' }));

  beforeEach(async () => {
    tableName = `players-${randomUUID()}`;
    await client.send(new CreateTableCommand(playersTableDefinition(tableName)));
    repository = new DynamoDbPlayerRepository(documentClient, tableName);
  });

  afterEach(async () => {
    await client.send(new DeleteTableCommand({ TableName: tableName }));
  });

  afterAll(() => {
    client.destroy();
  });

  it('stores the players', async () => {
    await seed();

    await expect(repository.findById(52)).resolves.toEqual(initialPlayers[0]);
  });

  it('continues the ids after the largest initial id', async () => {
    await seed();

    await expect(createPlayer('First')).resolves.toMatchObject({ id: 103 });
  });

  it('does not duplicate players when run twice', async () => {
    await expect(seed()).resolves.toBe(2);
    await expect(seed()).resolves.toBe(0);

    await expect(repository.findAll()).resolves.toHaveLength(2);
  });

  it('does not overwrite an existing player', async () => {
    await seed();
    const changed = aPlayer({
      id: 52,
      firstname: 'Novak',
      lastname: 'Djokovic',
      pictureKey: 'players/52/other.webp',
    });

    await seedPlayers(documentClient, tableName, [changed]);

    await expect(repository.findById(52)).resolves.toEqual(initialPlayers[0]);
  });

  it('skips an initial player whose name is already taken', async () => {
    await repository.create(aNewPlayer({ firstname: 'Novak', lastname: 'Djokovic' }));

    await expect(seed()).resolves.toBe(1);

    await expect(repository.findById(52)).resolves.toBeNull();
    await expect(repository.findAll()).resolves.toHaveLength(2);
  });

  it('never lowers the counter', async () => {
    await seed();
    await createPlayer('First');
    await seed();

    await expect(createPlayer('Second')).resolves.toMatchObject({ id: 104 });
  });

  it('raises a counter below the largest initial id', async () => {
    await createPlayer('First');
    await seed();

    await expect(createPlayer('Second')).resolves.toMatchObject({ id: 103 });
  });

  it('reserves the names of the initial players', async () => {
    await seed();

    await expect(
      repository.create(aNewPlayer({ firstname: 'NOVAK', lastname: 'djokovic' })),
    ).rejects.toThrow(PlayerAlreadyExistsError);
  });
});
