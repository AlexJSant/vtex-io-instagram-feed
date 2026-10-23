import { createSchedulerSyncRoute, securelyMatches } from '../routes'
import type { FeedRepository } from '../repository'
import { synchronizeFeed } from '../sync'
import type { FeedSnapshot } from '../types'

jest.mock('@vtex/api', () => ({
  method: jest.fn(() => jest.fn()),
}))

const APP_ID = 'sunhouse.instagram-feed@0.0.1'
const VALID_SECRET = 's'.repeat(32)

function snapshot(): FeedSnapshot {
  return {
    items: [],
    lastSyncedAt: '2026-10-22T12:00:01.000Z',
    syncStartedAt: '2026-10-22T12:00:00.000Z',
    source: 'meta',
  }
}

function createTestContext({
  method = 'POST',
  token,
  settings = {
    schedulerSyncSecret: VALID_SECRET,
    instagramAccessToken: 'mock-instagram-access-token',
  },
  query = {},
}: {
  method?: string
  token?: string
  settings?: unknown
  query?: Record<string, string>
} = {}) {
  const instagram = {
    getProfile: jest.fn().mockResolvedValue({
      user_id: '17841400959987384',
      username: 'sunhousemoveis',
    }),
    getMedia: jest.fn().mockResolvedValue({ data: [] }),
  }

  const vbase = {
    getJSON: jest.fn(),
    saveJSON: jest.fn(),
  }

  const headers = new Map<string, string>()

  if (token !== undefined) {
    headers.set('x-sunhouse-scheduler-token', token)
  }

  const ctx = {
    method,
    query,
    body: undefined,
    status: undefined,
    clients: {
      apps: {
        getAppSettings: jest.fn().mockResolvedValue(settings),
      },
      instagram,
      vbase,
    },
    vtex: {
      workspace: 'dev1',
      requestId: 'scheduler-test',
      logger: { error: jest.fn() },
    },
    get: jest.fn((name: string) => headers.get(name.toLowerCase()) ?? ''),
    set: jest.fn(),
  }

  return { ctx: (ctx as unknown) as Context, instagram, vbase }
}

function createRepository(): FeedRepository {
  return {
    getLatest: jest.fn().mockResolvedValue(snapshot()),
    saveSnapshot: jest.fn(),
    saveMetadata: jest.fn(),
    prune: jest.fn(),
  }
}

describe('scheduler synchronization route', () => {
  const previousAppId = process.env.VTEX_APP_ID

  beforeAll(() => {
    process.env.VTEX_APP_ID = APP_ID
  })

  afterAll(() => {
    if (previousAppId === undefined) {
      delete process.env.VTEX_APP_ID
    } else {
      process.env.VTEX_APP_ID = previousAppId
    }
  })

  it.each([
    ['missing', undefined],
    ['invalid', 'x'.repeat(32)],
  ])(
    'rejects a %s credential before touching Meta or VBase',
    async (_name, token) => {
      const { ctx, instagram, vbase } = createTestContext({ token })
      const synchronize = jest.fn()
      const createRepositoryMock = jest.fn(() => createRepository())
      const route = createSchedulerSyncRoute({
        createRepository: createRepositoryMock,
        synchronize,
      })

      await route(ctx)

      expect(ctx.status).toBe(401)
      expect(synchronize).not.toHaveBeenCalled()
      expect(createRepositoryMock).not.toHaveBeenCalled()
      expect(instagram.getProfile).not.toHaveBeenCalled()
      expect(instagram.getMedia).not.toHaveBeenCalled()
      expect(vbase.getJSON).not.toHaveBeenCalled()
      expect(vbase.saveJSON).not.toHaveBeenCalled()
    }
  )

  it('blocks execution with a generic 503 when the secret is not configured', async () => {
    const { ctx } = createTestContext({ token: VALID_SECRET, settings: {} })
    const synchronize = jest.fn()
    const createRepositoryMock = jest.fn(() => createRepository())
    const route = createSchedulerSyncRoute({
      createRepository: createRepositoryMock,
      synchronize,
    })

    await route(ctx)

    expect(ctx.status).toBe(503)
    expect(ctx.body).toEqual({ ok: false })
    expect(synchronize).not.toHaveBeenCalled()
    expect(createRepositoryMock).not.toHaveBeenCalled()
  })

  it('allows a valid credential to run the Meta synchronization', async () => {
    const { ctx, instagram } = createTestContext({ token: VALID_SECRET })
    const repository = createRepository()
    const route = createSchedulerSyncRoute({
      createRepository: jest.fn(() => repository),
      synchronize: synchronizeFeed,
    })

    await route(ctx)

    expect(ctx.status).toBe(200)
    expect(instagram.getProfile).toHaveBeenCalledWith(
      'mock-instagram-access-token'
    )
    expect(instagram.getMedia).toHaveBeenCalled()
    expect(repository.saveSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'meta' }),
      'scheduler-test'
    )
    expect(ctx.body).toMatchObject({ ok: true, source: 'meta' })
    expect(ctx.set).toHaveBeenCalledWith('Cache-Control', 'no-store')
  })

  it('preserves synchronization failures instead of returning HTTP 200', async () => {
    const { ctx } = createTestContext({ token: VALID_SECRET })
    const synchronize = jest.fn().mockRejectedValue(
      Object.assign(new Error('mock failure'), {
        category: 'upstream',
        upstreamStatus: 502,
      })
    )

    const route = createSchedulerSyncRoute({
      createRepository: jest.fn(() => createRepository()),
      synchronize,
    })

    await route(ctx)

    expect(ctx.status).toBe(503)
    expect(ctx.body).toEqual({
      ok: false,
      category: 'upstream',
      upstreamStatus: 502,
    })
  })

  it('does not execute synchronization for methods other than POST', async () => {
    const { ctx } = createTestContext({ method: 'GET', token: VALID_SECRET })
    const synchronize = jest.fn()
    const route = createSchedulerSyncRoute({
      createRepository: jest.fn(() => createRepository()),
      synchronize,
    })

    await route(ctx)

    expect(ctx.status).toBe(405)
    expect(synchronize).not.toHaveBeenCalled()
    expect(ctx.set).toHaveBeenCalledWith('Allow', 'POST')
  })

  it('ignores source=fixture and keeps the Meta synchronization mode', async () => {
    const { ctx, instagram } = createTestContext({
      token: VALID_SECRET,
      query: { source: 'fixture' },
    })

    const route = createSchedulerSyncRoute({
      createRepository: jest.fn(() => createRepository()),
      synchronize: synchronizeFeed,
    })

    await route(ctx)

    expect(instagram.getProfile).toHaveBeenCalled()
    expect(ctx.body).toMatchObject({ ok: true, source: 'meta' })
  })
})

describe('secure scheduler credential comparison', () => {
  it('handles equal and unequal byte lengths safely', () => {
    expect(securelyMatches(VALID_SECRET, VALID_SECRET)).toBe(true)
    expect(securelyMatches('short', VALID_SECRET)).toBe(false)
    expect(securelyMatches('x'.repeat(32), VALID_SECRET)).toBe(false)
  })
})
