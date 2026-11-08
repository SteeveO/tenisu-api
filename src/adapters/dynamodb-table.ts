import type { CreateTableCommandInput } from '@aws-sdk/client-dynamodb';
import { playerNameKey, type Player } from '../domain/player';

export const ENTITY_TYPE_INDEX = 'entityType';
export const PLAYER_ENTITY_TYPE = 'PLAYER';
export const COUNTER_KEY = 'COUNTER#player';

export const playerKey = (id: number) => `PLAYER#${String(id)}`;

export const playerItem = (player: Player) => ({
  PK: playerKey(player.id),
  entityType: PLAYER_ENTITY_TYPE,
  ...player,
});

export const nameItem = (player: Player) => ({
  PK: `NAME#${playerNameKey(player.firstname, player.lastname)}`,
  playerId: player.id,
});

/** Single-table layout (D20), shared by the tests and the seed script. */
export function playersTableDefinition(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'PK', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'entityType', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: ENTITY_TYPE_INDEX,
        KeySchema: [{ AttributeName: 'entityType', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  };
}
