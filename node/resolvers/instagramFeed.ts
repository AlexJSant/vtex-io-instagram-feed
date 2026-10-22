import { VBaseFeedRepository } from '../repository'

export async function instagramFeed(
  _root: unknown,
  _args: unknown,
  ctx: Context
) {
  const repository = new VBaseFeedRepository(
    ctx.clients.vbase,
    ctx.vtex.workspace
  )

  try {
    const snapshot = await repository.getLatest()

    if (snapshot) {
      return {
        items: snapshot.items,
        lastSyncedAt: snapshot.lastSyncedAt,
        source: snapshot.source,
      }
    }
  } catch {
    ctx.vtex.logger.error({
      message: 'instagram-feed-read-failed',
      category: 'persistence',
    })
  }

  return {
    items: [],
    lastSyncedAt: null,
    source: 'meta',
  }
}
