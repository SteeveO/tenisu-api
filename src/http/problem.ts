import { STATUS_CODES } from 'node:http';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import {
  PlayerAlreadyExistsError,
  PlayerNotFoundError,
  UnknownCountryError,
} from '../domain/errors';

interface FieldError {
  readonly path: string;
  readonly message: string;
}

/** The request does not match its schema. Raised by the validation hook. */
export class RequestValidationError extends Error {
  constructor(readonly fieldErrors: readonly FieldError[]) {
    super('The request is invalid.');
    this.name = 'RequestValidationError';
  }
}

interface ProblemDescription {
  readonly status: ContentfulStatusCode;
  readonly detail: string;
  readonly errors?: readonly FieldError[];
}

/** The only place where errors are translated into HTTP. */
function describeProblem(error: unknown): ProblemDescription {
  if (error instanceof RequestValidationError) {
    return {
      status: 400,
      detail: error.message,
      errors: error.fieldErrors,
    };
  }
  if (error instanceof UnknownCountryError) {
    return { status: 400, detail: error.message };
  }
  if (error instanceof PlayerNotFoundError) {
    return { status: 404, detail: error.message };
  }
  if (error instanceof PlayerAlreadyExistsError) {
    return { status: 409, detail: error.message };
  }
  // Raised by the framework, for instance on a malformed JSON body.
  if (error instanceof HTTPException && error.status < 500) {
    return { status: error.status, detail: error.message };
  }

  // Details are logged, never sent: they could expose internals.
  console.error(error);
  return {
    status: 500,
    detail: 'An unexpected error occurred.',
  };
}

function problemResponse(context: Context, problem: ProblemDescription): Response {
  // With the about:blank type, RFC 7807 expects the title to be the HTTP status phrase.
  const title = STATUS_CODES[problem.status] ?? 'Error';
  const body = { type: 'about:blank', title, ...problem, instance: context.req.path };
  return context.body(JSON.stringify(body), problem.status, {
    'Content-Type': 'application/problem+json',
  });
}

export function handleError(error: unknown, context: Context): Response {
  return problemResponse(context, describeProblem(error));
}

export function handleNotFound(context: Context): Response {
  return problemResponse(context, {
    status: 404,
    detail: 'This route does not exist.',
  });
}
