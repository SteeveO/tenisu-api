import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { describe, expect, it, vi } from 'vitest';
import { isNameAlreadyStored, retryOnTransactionConflict } from './dynamodb-player-repository';

// DynamoDB Local does not reproduce every cancellation reason of the real service,
// so their handling is tested directly.
function cancelledTransaction(playerItemCode: string, nameItemCode: string) {
  return new TransactionCanceledException({
    message: 'Transaction cancelled',
    $metadata: {},
    CancellationReasons: [{ Code: playerItemCode }, { Code: nameItemCode }],
  });
}

const conflict = cancelledTransaction('None', 'TransactionConflict');
const nameStored = cancelledTransaction('None', 'ConditionalCheckFailed');

describe('isNameAlreadyStored', () => {
  it('is true when the condition on the name item failed', () => {
    expect(isNameAlreadyStored(nameStored)).toBe(true);
  });

  it('is false for a conflict, which does not prove the name is stored', () => {
    expect(isNameAlreadyStored(conflict)).toBe(false);
  });

  it('is false when the failure concerns the player item', () => {
    expect(isNameAlreadyStored(cancelledTransaction('ConditionalCheckFailed', 'None'))).toBe(false);
  });

  it('is false for an unrelated error', () => {
    expect(isNameAlreadyStored(new Error('network'))).toBe(false);
  });
});

describe('retryOnTransactionConflict', () => {
  it('writes once when the write succeeds', async () => {
    const write = vi.fn().mockResolvedValue(undefined);

    await retryOnTransactionConflict(write);

    expect(write).toHaveBeenCalledTimes(1);
  });

  it('retries after a conflict', async () => {
    const write = vi.fn().mockRejectedValueOnce(conflict).mockResolvedValue(undefined);

    await retryOnTransactionConflict(write);

    expect(write).toHaveBeenCalledTimes(2);
  });

  it('surfaces the outcome of the retry, so a stored name is reported as such', async () => {
    const write = vi.fn().mockRejectedValueOnce(conflict).mockRejectedValue(nameStored);

    await expect(retryOnTransactionConflict(write)).rejects.toBe(nameStored);
  });

  it('gives up after three attempts and surfaces the conflict', async () => {
    const write = vi.fn().mockRejectedValue(conflict);

    await expect(retryOnTransactionConflict(write)).rejects.toBe(conflict);

    expect(write).toHaveBeenCalledTimes(3);
  });

  it('does not retry another failure', async () => {
    const write = vi.fn().mockRejectedValue(nameStored);

    await expect(retryOnTransactionConflict(write)).rejects.toBe(nameStored);

    expect(write).toHaveBeenCalledTimes(1);
  });
});
