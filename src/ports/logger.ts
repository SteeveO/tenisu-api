/** Structured logging, so that the HTTP layer does not depend on a logging library. */
export interface Logger {
  info(message: string, attributes: Record<string, unknown>): void;
  error(message: string, error: Error): void;
}
