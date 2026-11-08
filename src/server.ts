import { serve } from '@hono/node-server';
import { createApp } from './http/app';

// Local entry point: same wiring as handler.ts, served by Node.
const port = Number(process.env['PORT'] ?? 3000);

serve({ fetch: createApp().fetch, port }, (info) => {
  console.log(`Tenisu API listening on http://localhost:${String(info.port)}`);
});
