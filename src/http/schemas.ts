import { z } from '@hono/zod-openapi';

const positiveInteger = z.number().int().positive();
const name = z.string().trim().min(1).max(100);
const matchResult = z.union([z.literal(0), z.literal(1)]);

export const PlayerIdParamsSchema = z.object({
  // A strict pattern rather than z.coerce, which would accept "1e3" or "0x10".
  id: z
    .string()
    .regex(/^[1-9]\d{0,14}$/, 'Must be a positive integer')
    .transform(Number)
    .openapi({ param: { name: 'id', in: 'path' }, type: 'integer', example: 52 }),
});

// Strict: an unknown key is refused, notably `id`, which only the server assigns (D14).
export const CreatePlayerBodySchema = z
  .strictObject({
    firstname: name.openapi({ example: 'Novak' }),
    lastname: name.openapi({ example: 'Djokovic' }),
    shortname: name.openapi({ example: 'N.DJO' }),
    sex: z.enum(['M', 'F']),
    countryCode: z.string().openapi({ description: 'IOC code', example: 'SRB' }),
    rank: positiveInteger.openapi({ example: 2 }),
    points: z.number().int().nonnegative().openapi({ example: 2542 }),
    weightGrams: positiveInteger.openapi({ example: 80000 }),
    heightCm: positiveInteger.openapi({ example: 188 }),
    age: positiveInteger.openapi({ example: 31 }),
    lastResults: z
      .array(matchResult)
      .max(100)
      .openapi({ description: '1 is a win, 0 a loss', example: [1, 1, 0] }),
  })
  .openapi('CreatePlayerBody');

export const PlayerSchema = z
  .object({
    id: z.number().int(),
    firstname: z.string(),
    lastname: z.string(),
    shortname: z.string(),
    sex: z.enum(['M', 'F']),
    country: z.object({
      code: z.string().openapi({ description: 'IOC code', example: 'SRB' }),
      name: z.string().openapi({ example: 'Serbie' }),
      picture: z.string().openapi({ description: 'Flag URL' }),
    }),
    picture: z.string().nullable().openapi({ description: 'Null until a picture is uploaded' }),
    rank: z.number().int(),
    points: z.number().int(),
    weightGrams: z.number().int(),
    heightCm: z.number().int(),
    age: z.number().int(),
    lastResults: z.array(matchResult),
  })
  .openapi('Player');

export const StatisticsSchema = z
  .object({
    bestCountries: z.object({
      winRatio: z.number().nullable(),
      countries: z.array(
        z.object({ code: z.string(), wins: z.number().int(), matches: z.number().int() }),
      ),
    }),
    averageBmi: z.number().nullable(),
    medianHeightCm: z.number().nullable(),
  })
  .openapi('Statistics');

export const ProblemSchema = z
  .object({
    type: z.string().openapi({ example: 'about:blank' }),
    title: z.string().openapi({ example: 'Not Found' }),
    status: z.number().int().openapi({ example: 404 }),
    detail: z.string(),
    instance: z.string().openapi({ example: '/players/999' }),
    errors: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional()
      .openapi({ description: 'Invalid fields, on validation errors only' }),
  })
  .openapi('Problem');
