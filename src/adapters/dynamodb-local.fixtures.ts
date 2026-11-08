import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export function createDynamoDbLocalClient(): DynamoDBClient {
  return new DynamoDBClient({
    region: 'eu-north-1',
    endpoint: process.env['DYNAMODB_ENDPOINT'] ?? 'http://localhost:8000',
    // DynamoDB Local requires credentials but never checks them.
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });
}
