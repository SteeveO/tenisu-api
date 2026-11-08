import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from './player-cursor';

describe('player cursor', () => {
  it('decodes what it encoded', () => {
    const position = { rank: 2, points: 2542, id: 52 };

    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  it.each([
    ['not base64 JSON', '@@@'],
    ['JSON of the wrong shape', Buffer.from('{"rank":1}').toString('base64url')],
    ['too few values', Buffer.from('[1,2]').toString('base64url')],
    ['non-integer values', Buffer.from('[1,2,"x"]').toString('base64url')],
    ['an empty value', ''],
  ])('rejects %s', (_label, cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });
});
