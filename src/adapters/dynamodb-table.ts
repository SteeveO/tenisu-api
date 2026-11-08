import type { CreateTableCommandInput } from '@aws-sdk/client-dynamodb';

export const ENTITY_TYPE_INDEX = 'entityType';

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
