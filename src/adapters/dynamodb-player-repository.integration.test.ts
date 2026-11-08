import { randomUUID } from 'node:crypto';
import { CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { afterAll, afterEach } from 'vitest';
import { createDynamoDbLocalClient } from './dynamodb-local.fixtures';
import { DynamoDbPlayerRepository } from './dynamodb-player-repository';
import { playersTableDefinition } from './dynamodb-table';
import { describePlayerRepositoryContract } from './player-repository.contract';

const client = createDynamoDbLocalClient();
const documentClient = DynamoDBDocumentClient.from(client);

let tableName: string;

// A table per test keeps tests isolated from each other.
describePlayerRepositoryContract('DynamoDB', async () => {
  tableName = `players-${randomUUID()}`;
  await client.send(new CreateTableCommand(playersTableDefinition(tableName)));
  return new DynamoDbPlayerRepository(documentClient, tableName);
});

afterEach(async () => {
  await client.send(new DeleteTableCommand({ TableName: tableName }));
});

afterAll(() => {
  client.destroy();
});
