import type { InstagramClient } from './clients/instagram'
import { readRuntimeConfiguration } from './credentials'
import type { AppsSettingsClient } from './credentials'
import { DEVELOPMENT_FIXTURES } from './fixtures'
import { normalizeMedia } from './normalize'
import type { FeedRepository } from './repository'
import type {
  FeedItem,
  FeedSnapshot,
  MetaMedia,
  SyncErrorCategory,
} from './types'

const MAX_PAGES = 3
const EXPECTED_USER_ID = '17841400959987384'
const EXPECTED_USERNAME = 'sunhousemoveis'

interface SafeLogger {
  error: (message: Record<string, unknown>) => void
}

type UpstreamError = {
  response?: {
    status?: number
  }
  code?: string
}

function errorCategory(error: UpstreamError): SyncErrorCategory {
  const status = error.response?.status

  if (status === 401 || status === 403) {
    return 'authentication'
  }

  if (status === 429) {
    return 'rate-limit'
  }

  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return 'timeout'
  }

  if (status && status >= 500) {
    return 'upstream'
  }

  return 'invalid-response'
}

async function readMetaItems(
  instagram: InstagramClient,
  accessToken: string
): Promise<FeedItem[]> {
  const profile = await instagram.getProfile(accessToken)

  if (
    profile.user_id !== EXPECTED_USER_ID ||
    profile.username !== EXPECTED_USERNAME
  ) {
    throw new Error('Instagram account does not match the expected profile')
  }

  const rawItems: MetaMedia[] = []
  const seenCursors = new Set<string>()
  let after: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    // Cursor pagination is intentionally sequential and capped by MAX_PAGES.
    // eslint-disable-next-line no-await-in-loop
    const response = await instagram.getMedia(accessToken, after)

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid Instagram response')
    }

    rawItems.push(...response.data)

    if (normalizeMedia(rawItems).length >= 8) {
      break
    }

    const nextCursor = response.paging?.cursors?.after

    if (
      typeof nextCursor !== 'string' ||
      !nextCursor ||
      seenCursors.has(nextCursor)
    ) {
      break
    }

    seenCursors.add(nextCursor)
    after = nextCursor
  }

  return normalizeMedia(rawItems)
}

export async function synchronizeFeed({
  instagram,
  apps,
  repository,
  requestId,
  logger,
  modeOverride,
  now = () => new Date(),
}: {
  instagram: InstagramClient
  apps: AppsSettingsClient
  repository: FeedRepository
  requestId: string
  logger: SafeLogger
  modeOverride?: 'fixture'
  now?: () => Date
}) {
  const syncStartedAt = now().toISOString()
  const previous = await repository.getLatest()

  try {
    let items: FeedItem[]
    const mode = modeOverride ?? 'meta'

    if (mode === 'fixture') {
      items = DEVELOPMENT_FIXTURES
    } else {
      const { accessToken } = await readRuntimeConfiguration(apps)

      items = await readMetaItems(instagram, accessToken)
    }

    const lastSyncedAt = now().toISOString()

    const snapshot: FeedSnapshot = {
      items,
      lastSyncedAt,
      syncStartedAt,
      source: mode,
    }

    await repository.saveSnapshot(snapshot, requestId)
    await repository.saveMetadata(
      {
        lastAttemptAt: lastSyncedAt,
        lastSuccessAt: lastSyncedAt,
        itemCount: items.length,
        lastErrorCategory: null,
      },
      requestId
    )

    try {
      await repository.prune()
    } catch {
      logger.error({
        message: 'instagram-feed-vbase-prune-failed',
        category: 'persistence',
      })
    }

    return snapshot
  } catch (error) {
    const explicitCategory = (error as { category?: SyncErrorCategory })
      .category

    const category = explicitCategory ?? errorCategory(error as UpstreamError)
    const attemptedAt = now().toISOString()

    logger.error({
      message: 'instagram-feed-sync-failed',
      category,
      status: (error as UpstreamError).response?.status,
    })

    try {
      await repository.saveMetadata(
        {
          lastAttemptAt: attemptedAt,
          lastSuccessAt: previous?.lastSyncedAt ?? null,
          itemCount: previous?.items.length ?? 0,
          lastErrorCategory: category,
        },
        requestId
      )
    } catch {
      logger.error({
        message: 'instagram-feed-operational-metadata-write-failed',
        category: 'persistence',
      })
    }

    throw Object.assign(new Error('Instagram feed synchronization failed'), {
      category,
      upstreamStatus: (error as UpstreamError).response?.status ?? null,
    })
  }
}
