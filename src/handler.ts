import { Logger } from '@aws-lambda-powertools/logger';
import { handle } from '@hono/aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDbPlayerRepository } from './adapters/dynamodb-player-repository';
import { PlayerUseCases } from './application/player-use-cases';
import { requireEnv } from './env';
import { createApp } from './http/app';

// Lambda entry point: wires dependencies once per cold start.
const logger = new Logger({ serviceName: 'tenisu-api' });
const repository = new DynamoDbPlayerRepository(
  DynamoDBDocumentClient.from(new DynamoDBClient({})),
  requireEnv('PLAYERS_TABLE'),
);

const handleRequest = handle(
  createApp({
    useCases: new PlayerUseCases(repository),
    cdnBaseUrl: requireEnv('CDN_BASE_URL'),
    logger,
  }),
);

export const handler: typeof handleRequest = (event, context) => {
  // Adds the request id and the cold start flag to every log of this invocation.
  logger.addContext(context);
  return handleRequest(event, context);
};
