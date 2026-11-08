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
    country: z.strictObject({
      code: z.string().toUpperCase().openapi({ description: 'IOC code', example: 'SRB' }),
    }),
    data: z.strictObject({
      rank: positiveInteger.openapi({ example: 2 }),
      points: z.number().int().nonnegative().openapi({ example: 2542 }),
      weight: z
        .number()
        .int()
        .min(30000)
        .max(200000)
        .openapi({ description: 'Weight in grams', example: 80000 }),
      height: z
        .number()
        .int()
        .min(100)
        .max(250)
        .openapi({ description: 'Height in centimeters', example: 188 }),
      age: positiveInteger.openapi({ example: 31 }),
      last: z
        .array(matchResult)
        .max(100)
        .openapi({ description: 'Last matches: 1 is a win, 0 a loss', example: [1, 1, 0] }),
    }),
  })
  .openapi('CreatePlayerBody');

export type CreatePlayerBody = z.output<typeof CreatePlayerBodySchema>;

export const PlayerSchema = z
  .object({
    id: z.number().int(),
    firstname: z.string(),
    lastname: z.string(),
    shortname: z.string(),
    sex: z.enum(['M', 'F']),
    country: z.object({
      picture: z.string().openapi({ description: 'Flag URL' }),
      code: z.string().openapi({ description: 'IOC code', example: 'SRB' }),
    }),
    picture: z.string().nullable().openapi({ description: 'Null until a picture is uploaded' }),
    data: z.object({
      rank: z.number().int(),
      points: z.number().int(),
      weight: z.number().int().openapi({ description: 'Weight in grams', example: 80000 }),
      height: z.number().int().openapi({ description: 'Height in centimeters', example: 188 }),
      age: z.number().int(),
      last: z.array(matchResult).openapi({ description: 'Last matches: 1 is a win, 0 a loss' }),
    }),
  })
  .openapi('Player');

export const PlayerListSchema = z.object({ players: z.array(PlayerSchema) }).openapi('PlayerList');

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
