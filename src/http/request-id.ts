import { z } from '@hono/zod-openapi';
import { createMiddleware } from 'hono/factory';

// Parsed, not cast: outside Lambda (local server, tests) the bindings differ.
const lambdaBindingsSchema = z.object({
  lambdaContext: z.object({ awsRequestId: z.string() }),
});

/** Lets a client quote the id that finds the matching logs in CloudWatch (D43). */
export const requestIdHeader = createMiddleware(async (c, next) => {
  await next();
  const bindings = lambdaBindingsSchema.safeParse(c.env);
  if (bindings.success) {
    c.header('X-Request-Id', bindings.data.lambdaContext.awsRequestId);
  }
});
