import type { VBase } from '@vtex/api'

import { VBaseFeedRepository } from '../repository'
import type { FeedSnapshot } from '../types'

function snapshot(syncStartedAt: string): FeedSnapshot {
  return {
    items: [],
    lastSyncedAt: syncStartedAt,
    syncStartedAt,
    source: 'meta',
  }
}

describe('VBaseFeedRepository', () => {
  it('reads the newest immutable snapshot, regardless of completion order', async () => {
    const files = new Map<string, FeedSnapshot>()
    let revision = 0
    const vbase = {
      saveJSON: jest.fn(
        async (
          _bucket: string,
          path: string,
          value: FeedSnapshot,
          _tracing: unknown,
          ifMatch?: string
        ) => {
          if (
            ifMatch &&
            ifMatch !== `"${revision}"` &&
            path.endsWith('latest.json')
          ) {
            throw Object.assign(new Error('write conflict'), {
              response: { status: 412 },
            })
          }

          files.set(path, value)
          revision++
        }
      ),
      getRawJSON: jest.fn(async (_bucket: string, path: string) => ({
        data: files.get(path) ?? null,
        headers: files.has(path) ? { etag: `"${revision}"` } : {},
      })),
      listFiles: jest.fn(async () => ({
        data: [...files.keys()].reverse().map((path) => ({ path })),
        next: '',
      })),
      getJSON: jest.fn(
        async (_bucket: string, path: string) => files.get(path) ?? null
      ),
    }

    const repository = new VBaseFeedRepository(
      (vbase as unknown) as VBase,
      'development'
    )

    await repository.saveSnapshot(snapshot('2026-10-21T12:00:00.000Z'), 'newer')
    await repository.saveSnapshot(
      snapshot('2026-10-21T11:00:00.000Z'),
      'older-finishing-last'
    )

    const latest = await repository.getLatest()

    expect(latest).toMatchObject({
      syncStartedAt: '2026-10-21T12:00:00.000Z',
    })
    expect([...files.keys()]).toHaveLength(3)
  })

  it('separates production and development paths', async () => {
    const saveJSON = jest.fn(async () => undefined)
    const vbase = {
      saveJSON,
      getRawJSON: jest.fn(async () => ({ data: null, headers: {} })),
    }

    await new VBaseFeedRepository(
      (vbase as unknown) as VBase,
      'master'
    ).saveSnapshot(snapshot('2026-10-21T12:00:00.000Z'), 'request')

    const firstCall = (saveJSON.mock.calls[0] as unknown) as [
      string,
      string,
      FeedSnapshot
    ]

    expect(firstCall[1]).toMatch(/^production\/snapshots\//)
  })

  it('treats a missing VBase bucket as an empty initial repository', async () => {
    const repository = new VBaseFeedRepository(
      ({
        getJSON: jest.fn().mockResolvedValue(null),
      } as unknown) as VBase,
      'development'
    )

    await expect(repository.getLatest()).resolves.toBeNull()
  })

  it('does not hide non-404 VBase failures', async () => {
    const repository = new VBaseFeedRepository(
      ({
        getJSON: jest.fn().mockRejectedValue({
          response: { status: 503 },
        }),
      } as unknown) as VBase,
      'development'
    )

    await expect(repository.getLatest()).rejects.toMatchObject({
      response: { status: 503 },
    })
  })
})
