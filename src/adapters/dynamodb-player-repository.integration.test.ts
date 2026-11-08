import { randomUUID } from 'node:crypto';
import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { afterAll, afterEach } from 'vitest';
import { DynamoDbPlayerRepository } from './dynamodb-player-repository';
import { playersTableDefinition } from './dynamodb-table';
import { describePlayerRepositoryContract } from './player-repository.contract';

const client = new DynamoDBClient({
  region: 'eu-north-1',
  endpoint: process.env['DYNAMODB_ENDPOINT'] ?? 'http://localhost:8000',
  // DynamoDB Local requires credentials but never checks them.
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});
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
