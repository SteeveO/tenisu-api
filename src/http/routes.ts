import { createRoute, z } from '@hono/zod-openapi';
import {
  CreatePlayerBodySchema,
  PlayerIdParamsSchema,
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
  responses: {
    200: json(z.array(PlayerSchema), 'Players sorted by rank, then points'),
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
