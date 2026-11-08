import { createRoute, z } from '@hono/zod-openapi';
import {
  CountryListSchema,
  CreatePlayerBodySchema,
  HealthSchema,
  PlayerIdParamsSchema,
  PlayerListQuerySchema,
  PlayerListSchema,
  PlayerSchema,
  ProblemSchema,
  StatisticsSchema,
} from './schemas';

const problem = (description: string) => ({
  description,
  content: { 'application/problem+json': { schema: ProblemSchema } },
});

const json = <T extends z.ZodType>(schema: T, description: string) => ({
  description,
  content: { 'application/json': { schema } },
});

const internalError = problem('Unexpected error');

export const listPlayersRoute = createRoute({
  method: 'get',
  path: '/players',
  summary: 'List players from best to worst',
  request: { query: PlayerListQuerySchema },
  responses: {
    200: json(PlayerListSchema, 'A page of players sorted by rank, then points'),
    400: problem('Invalid filter, limit or cursor, or unknown country'),
    500: internalError,
  },
});

export const getPlayerRoute = createRoute({
  method: 'get',
  path: '/players/{id}',
  summary: 'Get a player',
  request: { params: PlayerIdParamsSchema },
  responses: {
    200: json(PlayerSchema, 'The player'),
    400: problem('Malformed id'),
    404: problem('Player not found'),
    500: internalError,
  },
});

export const createPlayerRoute = createRoute({
  method: 'post',
  path: '/players',
  summary: 'Create a player',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: CreatePlayerBodySchema } },
    },
  },
  responses: {
    201: {
      ...json(PlayerSchema, 'The created player'),
      headers: z.object({
        Location: z.string().openapi({ example: '/players/103' }),
      }),
    },
    400: problem('Invalid body or unknown country'),
    409: problem('A player with the same name already exists'),
    415: problem('The body is not JSON'),
    500: internalError,
  },
});

export const getStatisticsRoute = createRoute({
  method: 'get',
  path: '/stats',
  summary: 'Get player statistics',
  responses: {
    200: json(StatisticsSchema, 'Best countries, average BMI and median height'),
    500: internalError,
  },
});

export const listCountriesRoute = createRoute({
  method: 'get',
  path: '/countries',
  summary: 'List the countries accepted when creating a player',
  responses: {
    200: {
      ...json(CountryListSchema, 'Countries sorted by French name'),
      headers: z.object({
        'Cache-Control': z.string().openapi({ example: 'public, max-age=86400' }),
      }),
    },
    500: internalError,
  },
});

export const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  summary: 'Check that the API is running',
  responses: {
    200: json(HealthSchema, 'The API is running'),
  },
});
