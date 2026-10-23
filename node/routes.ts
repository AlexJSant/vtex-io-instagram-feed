import { timingSafeEqual } from 'crypto'

import { method } from '@vtex/api'

import { readSchedulerSyncSecret } from './credentials'
import type { FeedRepository } from './repository'
import { VBaseFeedRepository } from './repository'
import { synchronizeFeed } from './sync'

type Synchronize = typeof synchronizeFeed

export interface SyncDependencies {
  createRepository: (ctx: Context) => FeedRepository
  synchronize: Synchronize
}

const defaultDependencies: SyncDependencies = {
  createRepository: (ctx) =>
    new VBaseFeedRepository(ctx.clients.vbase, ctx.vtex.workspace),
  synchronize: synchronizeFeed,
}

function noStore(ctx: Context) {
  ctx.set('Cache-Control', 'no-store')
}

function schedulerToken(ctx: Context) {
  const header = ctx.get('X-Sunhouse-Scheduler-Token')

  return typeof header === 'string' ? header : ''
}

export function securelyMatches(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')

  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  )
}

async function executeSync(
  ctx: Context,
  fixtureRequested: boolean,
  dependencies: SyncDependencies
) {
  const repository = dependencies.createRepository(ctx)

  noStore(ctx)

  try {
    const snapshot = await dependencies.synchronize({
      instagram: ctx.clients.instagram,
      apps: ctx.clients.apps,
      repository,
      requestId: ctx.vtex.requestId,
      logger: ctx.vtex.logger,
      modeOverride: fixtureRequested ? 'fixture' : undefined,
    })

    const persistedSnapshot = await repository.getLatest()

    ctx.status = 200
    ctx.body = {
      ok: true,
      itemCount: snapshot.items.length,
      persistedItemCount: persistedSnapshot?.items.length ?? 0,
      lastSyncedAt: snapshot.lastSyncedAt,
      source: snapshot.source,
    }
  } catch (error) {
    ctx.status = 503
    ctx.body = {
      ok: false,
      category: (error as { category?: string }).category ?? 'invalid-response',
      upstreamStatus:
        (error as { upstreamStatus?: number | null }).upstreamStatus ?? null,
    }
  }
}

async function syncFeed(ctx: Context) {
  const fixtureRequested =
    ctx.vtex.workspace !== 'master' && ctx.query.source === 'fixture'

  await executeSync(ctx, fixtureRequested, defaultDependencies)
}

export function createSchedulerSyncRoute(
  dependencies: SyncDependencies = defaultDependencies
) {
  return async function syncSchedulerFeed(ctx: Context) {
    noStore(ctx)

    if (ctx.method !== 'POST') {
      ctx.set('Allow', 'POST')
      ctx.status = 405
      ctx.body = { ok: false }

      return
    }

    const suppliedToken = schedulerToken(ctx)

    if (!suppliedToken) {
      ctx.status = 401
      ctx.body = { ok: false }

      return
    }

    let expectedToken: string

    try {
      expectedToken = await readSchedulerSyncSecret(ctx.clients.apps)
    } catch {
      ctx.status = 503
      ctx.body = { ok: false }

      return
    }

    if (!securelyMatches(suppliedToken, expectedToken)) {
      ctx.status = 401
      ctx.body = { ok: false }

      return
    }

    // Scheduler calls always use Meta. Query parameters cannot enable fixtures.
    await executeSync(ctx, false, dependencies)
  }
}

export const routes = {
  sync: method({
    POST: [syncFeed],
  }),
  syncScheduler: createSchedulerSyncRoute(),
}
