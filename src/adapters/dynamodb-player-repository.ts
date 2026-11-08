import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  GetCommand,
  paginateQuery,
  TransactWriteCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { PlayerAlreadyExistsError } from '../domain/errors';
import { playerNameKey, type NewPlayer, type Player } from '../domain/player';
import type { PlayerRepository } from '../ports/player-repository';
import { ENTITY_TYPE_INDEX } from './dynamodb-table';

const PLAYER_ENTITY_TYPE = 'PLAYER';
const COUNTER_KEY = 'COUNTER#player';

// Position of the name item in the creation transaction.
const NAME_ITEM_POSITION = 1;

const MAX_WRITE_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 25;

// Items are parsed rather than cast: a corrupted item fails loudly here
// instead of spreading through the domain. Unknown keys (PK…) are stripped.
const playerItemSchema = z.object({
  id: z.number(),
  firstname: z.string(),
  lastname: z.string(),
  shortname: z.string(),
  sex: z.enum(['M', 'F']),
  countryCode: z.string(),
  pictureKey: z.string().nullable(),
  rank: z.number(),
  points: z.number(),
  weightGrams: z.number(),
  heightCm: z.number(),
  age: z.number(),
  lastResults: z.array(z.union([z.literal(0), z.literal(1)])),
});

const counterItemSchema = z.object({ lastId: z.number() });

const playerKey = (id: number) => `PLAYER#${String(id)}`;

export class DynamoDbPlayerRepository implements PlayerRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async findAll(): Promise<Player[]> {
    const pages = paginateQuery(
      { client: this.client },
      {
        TableName: this.tableName,
        IndexName: ENTITY_TYPE_INDEX,
        KeyConditionExpression: 'entityType = :entityType',
        ExpressionAttributeValues: { ':entityType': PLAYER_ENTITY_TYPE },
      },
    );

    const players: Player[] = [];
    for await (const page of pages) {
      players.push(...(page.Items ?? []).map((item) => playerItemSchema.parse(item)));
    }
    return players;
  }

  async findById(id: number): Promise<Player | null> {
    const { Item } = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: playerKey(id) },
        ConsistentRead: true,
      }),
    );
    return Item === undefined ? null : playerItemSchema.parse(Item);
  }

  async create(newPlayer: NewPlayer): Promise<Player> {
    const { firstname, lastname } = newPlayer;
    const player: Player = { ...newPlayer, id: await this.nextId(), pictureKey: null };

    try {
      await retryOnTransactionConflict(() =>
        this.client.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  TableName: this.tableName,
                  Item: { PK: playerKey(player.id), entityType: PLAYER_ENTITY_TYPE, ...player },
                  ConditionExpression: 'attribute_not_exists(PK)',
                },
              },
              {
                Put: {
                  TableName: this.tableName,
                  Item: { PK: `NAME#${playerNameKey(firstname, lastname)}`, playerId: player.id },
                  ConditionExpression: 'attribute_not_exists(PK)',
                },
              },
            ],
          }),
        ),
      );
    } catch (error) {
      if (isNameAlreadyStored(error)) {
        throw new PlayerAlreadyExistsError(firstname, lastname);
      }
      throw error;
    }

    return player;
  }

  private async nextId(): Promise<number> {
    const { Attributes } = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: COUNTER_KEY },
        UpdateExpression: 'ADD lastId :one',
        ExpressionAttributeValues: { ':one': 1 },
        ReturnValues: 'UPDATED_NEW',
      }),
    );
    return counterItemSchema.parse(Attributes).lastId;
  }
}

/**
 * Only a failed condition proves that the name is stored. A TransactionConflict
 * means another transaction was touching the item, and that one may fail too.
 */
export function isNameAlreadyStored(error: unknown): boolean {
  return (
    error instanceof TransactionCanceledException &&
    (error.CancellationReasons ?? []).at(NAME_ITEM_POSITION)?.Code === 'ConditionalCheckFailed'
  );
}

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof TransactionCanceledException &&
    (error.CancellationReasons ?? []).some((reason) => reason.Code === 'TransactionConflict')
  );
}

/**
 * The SDK does not retry cancelled transactions. Retrying is safe: a cancelled
 * transaction wrote nothing. The random delay keeps concurrent writers from
 * colliding again; once attempts are exhausted the conflict surfaces as an error.
 */
export async function retryOnTransactionConflict(write: () => Promise<unknown>): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await write();
      return;
    } catch (error) {
      if (!isTransactionConflict(error) || attempt === MAX_WRITE_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * RETRY_BASE_DELAY_MS * attempt),
      );
    }
  }
}
