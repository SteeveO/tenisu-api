import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import type { PlayerUseCases } from '../application/player-use-cases';
import { presentPlayer, toNewPlayer } from './player-presenter';
import { handleError, handleNotFound, RequestValidationError } from './problem';
import { createPlayerRoute, getPlayerRoute, getStatisticsRoute, listPlayersRoute } from './routes';

export interface AppDependencies {
  readonly useCases: PlayerUseCases;
  /** Base of public image URLs, without trailing slash. */
  readonly cdnBaseUrl: string;
}

/**
 * Builds the HTTP application. Shared by the Lambda entry point (handler.ts)
 * and the local server (server.ts), so both expose exactly the same routes.
 */
export function createApp({ useCases, cdnBaseUrl }: AppDependencies): OpenAPIHono {
  const app = new OpenAPIHono({
    defaultHook: (result) => {
      if (!result.success) {
        throw new RequestValidationError(
          result.error.issues.map((issue) => ({
            path: issue.path.map(String).join('.'),
            message: issue.message,
          })),
        );
      }
    },
  });

  app.onError(handleError);
  app.notFound(handleNotFound);

  app.openapi(listPlayersRoute, async (c) => {
    const players = await useCases.listPlayers();
    return c.json(
      players.map((player) => presentPlayer(player, cdnBaseUrl)),
      200,
    );
  });

  app.openapi(getPlayerRoute, async (c) => {
    const player = await useCases.getPlayer(c.req.valid('param').id);
    return c.json(presentPlayer(player, cdnBaseUrl), 200);
  });

  app.openapi(createPlayerRoute, async (c) => {
    const player = await useCases.createPlayer(toNewPlayer(c.req.valid('json')));
    c.header('Location', `/players/${String(player.id)}`);
    return c.json(presentPlayer(player, cdnBaseUrl), 201);
  });

  app.openapi(getStatisticsRoute, async (c) => {
    const statistics = await useCases.getStatistics();
    return c.json(
      {
        ...statistics,
        bestCountries: {
          ...statistics.bestCountries,
          countries: [...statistics.bestCountries.countries],
        },
      },
      200,
    );
  });

  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'Tenisu API', version: '1.0.0' },
  });
  app.get('/docs', swaggerUI({ url: '/openapi.json' }));

  return app;
}
