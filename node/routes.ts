import { method } from '@vtex/api'

import { VBaseFeedRepository } from './repository'
import { synchronizeFeed } from './sync'

async function syncFeed(ctx: Context) {
  const repository = new VBaseFeedRepository(
    ctx.clients.vbase,
    ctx.vtex.workspace
  )

  const fixtureRequested =
    ctx.vtex.workspace !== 'master' && ctx.query.source === 'fixture'

  try {
    const snapshot = await synchronizeFeed({
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

export const routes = {
  sync: method({
    POST: [syncFeed],
  }),
}
