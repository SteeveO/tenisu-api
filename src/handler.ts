import { handle } from '@hono/aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDbPlayerRepository } from './adapters/dynamodb-player-repository';
import { PlayerUseCases } from './application/player-use-cases';
import { createApp } from './http/app';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

// Lambda entry point: wires dependencies once per cold start.
const repository = new DynamoDbPlayerRepository(
  DynamoDBDocumentClient.from(new DynamoDBClient({})),
  requireEnv('PLAYERS_TABLE'),
);

export const handler = handle(
  createApp({
    useCases: new PlayerUseCases(repository),
    cdnBaseUrl: requireEnv('CDN_BASE_URL'),
  }),
);
