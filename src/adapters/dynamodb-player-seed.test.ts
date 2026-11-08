import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { describe, expect, it } from 'vitest';
import { isOnlyFailedConditions } from './dynamodb-player-seed';

const cancelled = (...codes: string[]) =>
  new TransactionCanceledException({
    message: 'cancelled',
    $metadata: {},
    CancellationReasons: codes.map((Code) => ({ Code })),
  });

describe('isOnlyFailedConditions', () => {
  it.each([
    ['the player and the name exist', ['ConditionalCheckFailed', 'ConditionalCheckFailed'], true],
    ['only the name exists', ['None', 'ConditionalCheckFailed'], true],
    ['a transaction conflict occurred', ['TransactionConflict', 'None'], false],
    [
      'a condition failed during a conflict',
      ['ConditionalCheckFailed', 'TransactionConflict'],
      false,
    ],
    ['no reason is given', [], false],
  ])('when %s', (_label, codes, expected) => {
    expect(isOnlyFailedConditions(cancelled(...codes))).toBe(expected);
  });

  it('is false for any other error', () => {
    expect(isOnlyFailedConditions(new Error('network'))).toBe(false);
  });
});
