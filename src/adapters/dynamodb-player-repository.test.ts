import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { describe, expect, it } from 'vitest';
import { isNameAlreadyTaken } from './dynamodb-player-repository';

// DynamoDB Local does not reproduce every cancellation reason of the real service,
// so the mapping is tested directly.
function cancelledTransaction(playerItemCode: string, nameItemCode: string) {
  return new TransactionCanceledException({
    message: 'Transaction cancelled',
    $metadata: {},
    CancellationReasons: [{ Code: playerItemCode }, { Code: nameItemCode }],
  });
}

describe('isNameAlreadyTaken', () => {
  it('is true when the name item already exists', () => {
    expect(isNameAlreadyTaken(cancelledTransaction('None', 'ConditionalCheckFailed'))).toBe(true);
  });

  it('is true when a concurrent transaction is writing the same name', () => {
    expect(isNameAlreadyTaken(cancelledTransaction('None', 'TransactionConflict'))).toBe(true);
  });

  it('is false when the failure concerns the player item', () => {
    expect(isNameAlreadyTaken(cancelledTransaction('ConditionalCheckFailed', 'None'))).toBe(false);
  });

  it('is false for an unrelated cancellation or error', () => {
    expect(isNameAlreadyTaken(cancelledTransaction('None', 'ThrottlingError'))).toBe(false);
    expect(isNameAlreadyTaken(new Error('network'))).toBe(false);
  });
});
