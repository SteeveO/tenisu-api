import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('createApp', () => {
  it('responds 404 to an unknown route', async () => {
    const response = await createApp().request('/unknown');

    expect(response.status).toBe(404);
  });
});
