import { handle } from '@hono/aws-lambda';
import { createApp } from './http/app';

// Lambda entry point: wires dependencies once per cold start.
export const handler = handle(createApp());
