import {
  ConditionalCheckFailedException,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import {
  TransactWriteCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import type { Player } from '../domain/player';
import { COUNTER_KEY, nameItem, playerItem } from './dynamodb-table';

const ABSENT = 'attribute_not_exists(PK)';

/**
 * Idempotent (D22, D37): inserts only what is missing, so running it on a live
 * table overwrites nothing, and it never lowers the id counter.
 * Returns the number of players actually inserted.
 */
export async function seedPlayers(
  client: DynamoDBDocumentClient,
  tableName: string,
  players: readonly Player[],
): Promise<number> {
  let inserted = 0;
  for (const player of players) {
    if (await insertIfMissing(client, tableName, player)) {
      inserted += 1;
    }
  }

  await raiseCounter(client, tableName, Math.max(0, ...players.map((player) => player.id)));
  return inserted;
}

async function insertIfMissing(
  client: DynamoDBDocumentClient,
  tableName: string,
  player: Player,
): Promise<boolean> {
  try {
    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          { Put: { TableName: tableName, Item: playerItem(player), ConditionExpression: ABSENT } },
          { Put: { TableName: tableName, Item: nameItem(player), ConditionExpression: ABSENT } },
        ],
      }),
    );
    return true;
  } catch (error) {
    if (isOnlyFailedConditions(error)) {
      return false;
    }
    throw error;
  }
}

/** The id or the name is taken. Any other cancellation reason remains a real failure. */
export function isOnlyFailedConditions(error: unknown): boolean {
  if (!(error instanceof TransactionCanceledException)) {
    return false;
  }
  const codes = (error.CancellationReasons ?? []).map((reason) => reason.Code);
  return (
    codes.includes('ConditionalCheckFailed') &&
    codes.every((code) => code === 'ConditionalCheckFailed' || code === 'None')
  );
}

async function raiseCounter(
  client: DynamoDBDocumentClient,
  tableName: string,
  lastId: number,
): Promise<void> {
  try {
    await client.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { PK: COUNTER_KEY },
        UpdateExpression: 'SET lastId = :lastId',
        ConditionExpression: 'attribute_not_exists(lastId) OR lastId < :lastId',
        ExpressionAttributeValues: { ':lastId': lastId },
      }),
    );
  } catch (error) {
    if (!(error instanceof ConditionalCheckFailedException)) {
      throw error;
    }
  }
}
