import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { InMemoryPlayerRepository } from '../adapters/in-memory-player-repository';
import { PlayerUseCases } from '../application/player-use-cases';
import type { Player } from '../domain/player';
import { aPlayer } from '../domain/player.fixtures';
import type { Logger } from '../ports/logger';
import type { PlayerRepository } from '../ports/player-repository';
import { createApp } from './app';

const CDN = 'https://cdn.example.com';

const validBody = {
  firstname: 'Novak',
  lastname: 'Djokovic',
  shortname: 'N.DJO',
  sex: 'M',
  country: { code: 'SRB' },
  data: { rank: 2, points: 2542, weight: 80000, height: 188, age: 31, last: [1, 1, 0] },
};

const bodyWithData = (data: Record<string, unknown>) => ({
  ...validBody,
  data: { ...validBody.data, ...data },
});

const aLogger = () => ({ info: vi.fn<Logger['info']>(), error: vi.fn<Logger['error']>() });

function appWith(repository: PlayerRepository, logger: Logger = aLogger()) {
  return createApp({ useCases: new PlayerUseCases(repository), cdnBaseUrl: CDN, logger });
}

function failingRepository(message = 'unavailable'): PlayerRepository {
  const fail = () => Promise.reject(new Error(message));
  return { findAll: fail, findById: fail, create: fail };
}

const appWithPlayers = (...players: Player[]) => appWith(new InMemoryPlayerRepository(players));

function postPlayer(app: ReturnType<typeof createApp>, body: unknown) {
  return app.request('/players', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function expectProblem(response: Response, status: number, path: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get('Content-Type')).toBe('application/problem+json');
  expect(await response.json()).toMatchObject({ type: 'about:blank', status, instance: path });
}

describe('GET /players', () => {
  it('returns an empty list when there is no player', async () => {
    const response = await appWithPlayers().request('/players');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ players: [], nextCursor: null });
  });

  it('returns players from best to worst', async () => {
    const app = appWithPlayers(
      aPlayer({ id: 1, lastname: 'Second', rank: 2 }),
      aPlayer({ id: 2, lastname: 'First', rank: 1 }),
    );

    const body = await (await app.request('/players')).json();

    expect(body).toMatchObject({ players: [{ lastname: 'First' }, { lastname: 'Second' }] });
  });
});

describe('GET /players filters and pagination', () => {
  const players = [
    aPlayer({ id: 1, firstname: 'A', rank: 1, sex: 'M', countryCode: 'SRB' }),
    aPlayer({ id: 2, firstname: 'B', rank: 2, sex: 'F', countryCode: 'USA' }),
    aPlayer({ id: 3, firstname: 'C', rank: 3, sex: 'M', countryCode: 'USA' }),
  ];
  const pageSchema = z.object({
    players: z.array(z.object({ id: z.number() }).loose()),
    nextCursor: z.string().nullable(),
  });

  async function getPage(app: ReturnType<typeof createApp>, query: string) {
    const response = await app.request(`/players?${query}`);
    expect(response.status).toBe(200);
    const page = pageSchema.parse(await response.json());
    return { ids: page.players.map((player) => player.id), nextCursor: page.nextCursor };
  }

  it('combines filters', async () => {
    const page = await getPage(appWithPlayers(...players), 'sex=M&country=USA');

    expect(page).toEqual({ ids: [3], nextCursor: null });
  });

  it('accepts a lowercase country code', async () => {
    const page = await getPage(appWithPlayers(...players), 'country=srb');

    expect(page.ids).toEqual([1]);
  });

  it('accepts a lowercase sex', async () => {
    const page = await getPage(appWithPlayers(...players), 'sex=f');

    expect(page.ids).toEqual([2]);
  });

  it('walks through the pages', async () => {
    const app = appWithPlayers(...players);

    const firstPage = await getPage(app, 'limit=2');
    const secondPage = await getPage(app, `limit=2&cursor=${String(firstPage.nextCursor)}`);

    expect(firstPage.ids).toEqual([1, 2]);
    expect(secondPage).toEqual({ ids: [3], nextCursor: null });
  });

  it('keeps the filters applied across pages', async () => {
    const app = appWithPlayers(...players);

    const firstPage = await getPage(app, 'sex=M&limit=1');
    const secondPage = await getPage(app, `sex=M&limit=1&cursor=${String(firstPage.nextCursor)}`);

    expect(secondPage).toEqual({ ids: [3], nextCursor: null });
  });

  it.each([
    ['an unknown sex', 'sex=X'],
    ['an unknown country', 'country=XXX'],
    ['a limit of 0', 'limit=0'],
    ['a limit above the maximum', 'limit=101'],
    ['a non-numeric limit', 'limit=abc'],
    ['a limit in scientific notation', 'limit=1e1'],
    ['an invalid cursor', 'cursor=@@@'],
  ])('responds 400 for %s', async (_label, query) => {
    const response = await appWithPlayers(...players).request(`/players?${query}`);

    await expectProblem(response, 400, '/players');
  });

  it('documents the query parameters', async () => {
    const response = await appWithPlayers().request('/openapi.json');
    const text = await response.text();

    for (const name of ['sex', 'country', 'limit', 'cursor']) {
      expect(text).toContain(`"name":"${name}"`);
    }
  });
});

describe('GET /players/{id}', () => {
  it('returns the player in the format of the original data, with public URLs', async () => {
    const app = appWithPlayers(
      aPlayer({
        id: 65,
        firstname: 'Stan',
        lastname: 'Wawrinka',
        shortname: 'S.WAW',
        sex: 'M',
        countryCode: 'SUI',
        pictureKey: 'players/65/abc.webp',
        rank: 21,
        points: 1784,
        weightGrams: 81000,
        heightCm: 183,
        age: 33,
        lastResults: [1, 1, 1, 0, 1],
      }),
    );

    const response = await app.request('/players/65');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: 65,
      firstname: 'Stan',
      lastname: 'Wawrinka',
      shortname: 'S.WAW',
      sex: 'M',
      country: { picture: `${CDN}/flags/ch.svg`, code: 'SUI' },
      picture: `${CDN}/players/65/abc.webp`,
      data: { rank: 21, points: 1784, weight: 81000, height: 183, age: 33, last: [1, 1, 1, 0, 1] },
    });
  });

  it('returns a null picture for a player without one', async () => {
    const response = await appWithPlayers(aPlayer({ id: 52 })).request('/players/52');

    expect(await response.json()).toMatchObject({ picture: null });
  });

  it('never exposes storage keys', async () => {
    const app = appWithPlayers(aPlayer({ id: 52, pictureKey: 'players/52/abc.webp' }));

    const body = await (await app.request('/players/52')).json();

    expect(body).not.toHaveProperty('pictureKey');
  });

  it('responds 404 for an unknown player', async () => {
    const response = await appWithPlayers().request('/players/999');

    await expectProblem(response, 404, '/players/999');
  });

  it.each(['abc', '0', '-1', '1.5', '1e3', '0x10'])('responds 400 for the id %s', async (id) => {
    const response = await appWithPlayers().request(`/players/${id}`);

    await expectProblem(response, 400, `/players/${id}`);
  });
});

describe('POST /players', () => {
  it('accepts a lowercase sex and stores it in uppercase', async () => {
    const response = await postPlayer(appWithPlayers(), { ...validBody, sex: 'f' });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ sex: 'F' });
  });

  it('still refuses an unknown sex', async () => {
    const response = await postPlayer(appWithPlayers(), { ...validBody, sex: 'x' });

    await expectProblem(response, 400, '/players');
  });

  it('responds 201 with a Location header and the created player', async () => {
    const response = await postPlayer(appWithPlayers(), validBody);

    expect(response.status).toBe(201);
    const created: unknown = await response.json();
    expect(created).toMatchObject({ id: 1, firstname: 'Novak', picture: null });
    expect(response.headers.get('Location')).toBe('/players/1');
  });

  it('creates a player that can be read at its Location', async () => {
    const app = appWithPlayers();

    const location = (await postPlayer(app, validBody)).headers.get('Location') ?? '';

    expect((await app.request(location)).status).toBe(200);
  });

  it('continues numbering after existing players', async () => {
    const response = await postPlayer(appWithPlayers(aPlayer({ id: 102 })), validBody);

    expect(response.headers.get('Location')).toBe('/players/103');
  });

  it('accepts a player without any match', async () => {
    const response = await postPlayer(appWithPlayers(), bodyWithData({ last: [] }));

    expect(response.status).toBe(201);
  });

  it('accepts zero points', async () => {
    const response = await postPlayer(appWithPlayers(), bodyWithData({ points: 0 }));

    expect(response.status).toBe(201);
  });

  it('refuses an id in the body', async () => {
    const response = await postPlayer(appWithPlayers(), { ...validBody, id: 7 });

    await expectProblem(response, 400, '/players');
  });

  it('refuses a height of 0 and creates no player', async () => {
    const app = appWithPlayers();

    const response = await postPlayer(app, bodyWithData({ height: 0 }));

    await expectProblem(response, 400, '/players');
    expect(await (await app.request('/players')).json()).toEqual({ players: [], nextCursor: null });
  });

  it.each([
    ['weight', 29999],
    ['weight', 200001],
    ['height', 99],
    ['height', 251],
    ['age', 101],
    ['height', 180.5],
    ['age', 0],
    ['rank', 0],
    ['points', -1],
    ['last', [2]],
  ])('refuses data.%s = %j', async (field, value) => {
    const response = await postPlayer(appWithPlayers(), bodyWithData({ [field]: value }));

    await expectProblem(response, 400, '/players');
  });

  it.each([
    ['sex', 'X'],
    ['firstname', '   '],
    ['picture', 'https://example.com/a.png'],
  ])('refuses %s = %j', async (field, value) => {
    const response = await postPlayer(appWithPlayers(), { ...validBody, [field]: value });

    await expectProblem(response, 400, '/players');
  });

  it('accepts the bounds of plausible weight, height and age', async () => {
    const app = appWithPlayers();

    const lightest = await postPlayer(app, {
      ...bodyWithData({ weight: 30000, height: 100, age: 1 }),
      lastname: 'Lower',
    });
    const heaviest = await postPlayer(app, {
      ...bodyWithData({ weight: 200000, height: 250, age: 100 }),
      lastname: 'Upper',
    });

    expect([lightest.status, heaviest.status]).toEqual([201, 201]);
  });

  it('lists the invalid fields', async () => {
    const response = await postPlayer(appWithPlayers(), bodyWithData({ height: undefined }));

    expect(await response.json()).toMatchObject({ errors: [{ path: 'data.height' }] });
  });

  it('responds 400 for an unknown country', async () => {
    const response = await postPlayer(appWithPlayers(), {
      ...validBody,
      country: { code: 'XXX' },
    });

    await expectProblem(response, 400, '/players');
  });

  it('accepts a country code in lowercase and stores it in uppercase', async () => {
    const response = await postPlayer(appWithPlayers(), {
      ...validBody,
      country: { code: 'srb' },
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ country: { code: 'SRB' } });
  });

  it('responds 400 for malformed JSON', async () => {
    const response = await appWithPlayers().request('/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });

    await expectProblem(response, 400, '/players');
  });

  it('responds 415 for a body that is not JSON', async () => {
    const response = await appWithPlayers().request('/players', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello',
    });

    await expectProblem(response, 415, '/players');
  });

  it('responds 409 for a player that already exists', async () => {
    const app = appWithPlayers();
    await postPlayer(app, validBody);

    const response = await postPlayer(app, { ...validBody, firstname: 'NOVAK' });

    await expectProblem(response, 409, '/players');
  });
});

describe('GET /stats', () => {
  it('returns null statistics when there is no player', async () => {
    const response = await appWithPlayers().request('/stats');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      bestCountries: { winRatio: null, countries: [] },
      averageBmi: null,
      medianHeightCm: null,
    });
  });

  it('returns the statistics of the players', async () => {
    const app = appWithPlayers(
      aPlayer({ countryCode: 'SRB', lastResults: [1, 1], weightGrams: 80000, heightCm: 200 }),
    );

    expect(await (await app.request('/stats')).json()).toEqual({
      bestCountries: { winRatio: 1, countries: [{ code: 'SRB', wins: 2, matches: 2 }] },
      averageBmi: 20,
      medianHeightCm: 200,
    });
  });
});

describe('GET /countries', () => {
  it('returns each country with its flag URL', async () => {
    const response = await appWithPlayers().request('/countries');

    expect(response.status).toBe(200);
    const { countries } = z
      .object({ countries: z.array(z.object({ code: z.string() }).loose()) })
      .parse(await response.json());
    expect(countries.find((country) => country.code === 'SUI')).toEqual({
      code: 'SUI',
      name: 'Suisse',
      picture: `${CDN}/flags/ch.svg`,
    });
  });

  it('can be cached for a day', async () => {
    const response = await appWithPlayers().request('/countries');

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
  });

  it('is documented in the OpenAPI specification', async () => {
    const response = await appWithPlayers().request('/openapi.json');

    expect(await response.text()).toContain('"/countries"');
  });
});

describe('unexpected errors', () => {
  const secret = 'dynamodb table players-prod is on fire';
  const failing = failingRepository(secret);

  it('responds 500 without leaking internal details', async () => {
    const response = await appWith(failing).request('/players');

    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toBe('application/problem+json');
    expect(await response.text()).not.toContain(secret);
  });

  it('logs the error with its details', async () => {
    const logger = aLogger();

    await appWith(failing, logger).request('/players');

    expect(logger.error).toHaveBeenCalledExactlyOnceWith('Unexpected error', new Error(secret));
  });
});

describe('request logs', () => {
  const requestLog = (method: string, path: string, status: number) => ({
    message: 'Request handled',
    request: { method, path, status },
    hasDuration: true,
  });

  const loggedRequests = (logger: ReturnType<typeof aLogger>) =>
    logger.info.mock.calls.map(([message, { durationMs, ...request }]) => ({
      message,
      request,
      hasDuration: typeof durationMs === 'number',
    }));

  it('logs a successful request', async () => {
    const logger = aLogger();

    await appWith(new InMemoryPlayerRepository(), logger).request('/players?limit=2');

    expect(loggedRequests(logger)).toEqual([requestLog('GET', '/players', 200)]);
  });

  it('logs the final status of a failed request', async () => {
    const logger = aLogger();

    await appWith(new InMemoryPlayerRepository(), logger).request('/players/abc');

    expect(loggedRequests(logger)).toEqual([requestLog('GET', '/players/abc', 400)]);
  });

  it('logs a preflight request', async () => {
    const logger = aLogger();

    await appWith(new InMemoryPlayerRepository(), logger).request('/players', {
      method: 'OPTIONS',
      headers: { Origin: 'https://front.example.com', 'Access-Control-Request-Method': 'POST' },
    });

    expect(loggedRequests(logger)).toEqual([requestLog('OPTIONS', '/players', 204)]);
  });

  it('does not log expected errors as errors', async () => {
    const logger = aLogger();

    await appWith(new InMemoryPlayerRepository(), logger).request('/players/999');

    expect(logger.error).not.toHaveBeenCalled();
  });
});

describe('X-Request-Id header', () => {
  const lambda = { lambdaContext: { awsRequestId: 'request-1' } };
  const repository = new InMemoryPlayerRepository();

  it('returns the Lambda request id on a successful response', async () => {
    const response = await appWith(repository).request('/players', {}, lambda);

    expect(response.headers.get('X-Request-Id')).toBe('request-1');
  });

  it('returns it on a problem response', async () => {
    const response = await appWith(failingRepository()).request('/players', {}, lambda);

    expect(response.status).toBe(500);
    expect(response.headers.get('X-Request-Id')).toBe('request-1');
  });

  it('is absent outside Lambda', async () => {
    const response = await appWith(repository).request('/players');

    expect(response.headers.has('X-Request-Id')).toBe(false);
  });
});

describe('GET /health', () => {
  it('responds that the API is running', async () => {
    const response = await appWithPlayers().request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('does not touch the database', async () => {
    const response = await appWith(failingRepository()).request('/health');

    expect(response.status).toBe(200);
  });
});

describe('unknown routes', () => {
  it('responds 404 in the problem format', async () => {
    const response = await appWithPlayers().request('/unknown');

    await expectProblem(response, 404, '/unknown');
  });
});

describe('CORS', () => {
  const ORIGIN = 'https://front.example.com';
  const withOrigin = { headers: { Origin: ORIGIN } };

  it('allows any origin on a successful response', async () => {
    const response = await appWithPlayers().request('/players', withOrigin);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('exposes the Location header', async () => {
    const response = await appWithPlayers().request('/players', withOrigin);

    expect(response.headers.get('Access-Control-Expose-Headers')).toBe('Location,X-Request-Id');
  });

  it('applies to problem responses', async () => {
    const app = appWithPlayers();

    const responses = await Promise.all([
      app.request('/players/999', withOrigin),
      app.request('/players/abc', withOrigin),
      app.request('/unknown', withOrigin),
    ]);

    expect(responses.map((response) => response.status)).toEqual([404, 400, 404]);
    for (const response of responses) {
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    }
  });

  it('answers the preflight request of a JSON POST', async () => {
    const response = await appWithPlayers().request('/players', {
      method: 'OPTIONS',
      headers: {
        Origin: ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('content-type');
  });
});

describe('API documentation', () => {
  it('describes every route in the OpenAPI document', async () => {
    const document: unknown = await (await appWithPlayers().request('/openapi.json')).json();

    expect(document).toMatchObject({
      paths: {
        '/players': { get: {}, post: {} },
        '/players/{id}': { get: {} },
        '/stats': { get: {} },
      },
    });
  });

  it('serves Swagger UI', async () => {
    const response = await appWithPlayers().request('/docs');

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('swagger');
  });
});
