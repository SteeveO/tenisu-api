import { Hono } from 'hono';

/**
 * Builds the HTTP application. Shared by the Lambda entry point (handler.ts)
 * and the local server (server.ts), so both expose exactly the same routes.
 * Dependencies (use cases) will be injected here as parameters.
 */
export function createApp(): Hono {
  return new Hono();
}
