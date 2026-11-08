import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { serve } from '@hono/node-server';
import { DynamoDbPlayerRepository } from './adapters/dynamodb-player-repository';
import { InMemoryPlayerRepository } from './adapters/in-memory-player-repository';
import { PlayerUseCases } from './application/player-use-cases';
import { requireEnv } from './env';
import { createApp } from './http/app';
import type { PlayerRepository } from './ports/player-repository';
import { loadInitialPlayers } from './seed/initial-players';

async function createRepository(): Promise<PlayerRepository> {
  if (process.env['STORAGE'] === 'memory') {
    return new InMemoryPlayerRepository(await loadInitialPlayers());
  }
  return new DynamoDbPlayerRepository(
    DynamoDBDocumentClient.from(new DynamoDBClient({ endpoint: requireEnv('DYNAMODB_ENDPOINT') })),
    requireEnv('PLAYERS_TABLE'),
  );
}

// Local entry point: same wiring as handler.ts, served by Node.
const port = Number(process.env['PORT'] ?? 3000);
const app = createApp({
  useCases: new PlayerUseCases(await createRepository()),
  cdnBaseUrl: requireEnv('CDN_BASE_URL'),
  logger: new Logger({ serviceName: 'tenisu-api' }),
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Tenisu API listening on http://localhost:${String(info.port)}`);
});
