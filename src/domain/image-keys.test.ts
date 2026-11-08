import { describe, expect, it } from 'vitest';
import { getCountry } from './country';
import { flagKey, playerPictureKey } from './image-keys';

describe('playerPictureKey', () => {
  it('builds a versioned key from the player id and the content hash', () => {
    expect(playerPictureKey(52, 'a1b2c3')).toBe('players/52/a1b2c3.webp');
  });
});

describe('flagKey', () => {
  it('uses the lowercase ISO code, not the IOC code', () => {
    expect(flagKey(getCountry('SUI'))).toBe('flags/ch.svg');
  });
});
