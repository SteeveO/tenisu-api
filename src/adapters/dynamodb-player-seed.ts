import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  TransactWriteCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import type { Player } from '../domain/player';
import { COUNTER_KEY, nameItem, playerItem } from './dynamodb-table';

/** Idempotent (D22): rewrites the given players and never lowers the id counter. */
export async function seedPlayers(
  client: DynamoDBDocumentClient,
  tableName: string,
  players: readonly Player[],
): Promise<void> {
  for (const player of players) {
    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          { Put: { TableName: tableName, Item: playerItem(player) } },
          { Put: { TableName: tableName, Item: nameItem(player) } },
        ],
      }),
    );
  }

  await raiseCounter(client, tableName, Math.max(0, ...players.map((player) => player.id)));
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
