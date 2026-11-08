import { serve } from '@hono/node-server';
import { InMemoryPlayerRepository } from './adapters/in-memory-player-repository';
import { PlayerUseCases } from './application/player-use-cases';
import { createApp } from './http/app';

// Local entry point: same wiring as handler.ts, served by Node.
const port = Number(process.env['PORT'] ?? 3000);
const app = createApp({
  useCases: new PlayerUseCases(new InMemoryPlayerRepository()),
  cdnBaseUrl: process.env['CDN_BASE_URL'] ?? 'http://localhost:4566/tenisu-images',
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Tenisu API listening on http://localhost:${String(info.port)}`);
});
