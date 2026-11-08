import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { listCountries } from '../application/country-use-cases';
import type { PlayerUseCases } from '../application/player-use-cases';
import { presentCountry } from './country-presenter';
import { encodeCursor } from './player-cursor';
import { presentPlayer, toNewPlayer } from './player-presenter';
import { handleError, handleNotFound, RequestValidationError } from './problem';
import {
  createPlayerRoute,
  getPlayerRoute,
  getStatisticsRoute,
  listCountriesRoute,
  listPlayersRoute,
} from './routes';

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

  // Any origin: the API is public and uses no cookies (D40).
  app.use('*', cors({ allowMethods: ['GET', 'POST'], exposeHeaders: ['Location'] }));

  app.onError(handleError);
  app.notFound(handleNotFound);

  app.openapi(listPlayersRoute, async (c) => {
    const { sex, country, limit, cursor } = c.req.valid('query');
    const page = await useCases.listPlayers({ sex, countryCode: country, limit, after: cursor });
    return c.json(
      {
        players: page.players.map((player) => presentPlayer(player, cdnBaseUrl)),
        nextCursor: page.next === null ? null : encodeCursor(page.next),
      },
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

  app.openapi(listCountriesRoute, (c) => {
    // The referential only changes with a deployment (D41).
    c.header('Cache-Control', 'public, max-age=86400');
    return c.json(
      { countries: listCountries().map((country) => presentCountry(country, cdnBaseUrl)) },
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
