import type { VBase } from '@vtex/api'

import type { FeedSnapshot, OperationalMetadata } from './types'

const BUCKET = 'instagram-feed'
const PAGE_SIZE = 100
const MAX_LIST_PAGES = 10
const MAX_LATEST_WRITE_ATTEMPTS = 4

export interface FeedRepository {
  getLatest(): Promise<FeedSnapshot | null>
  saveSnapshot(snapshot: FeedSnapshot, requestId: string): Promise<void>
  saveMetadata(metadata: OperationalMetadata, requestId: string): Promise<void>
  prune(): Promise<void>
}

type ListedFile = {
  path?: string
  name?: string
}

type VBaseError = {
  response?: {
    status?: number
  }
}

type RawSnapshotResponse = {
  data: FeedSnapshot | null
  headers?: Record<string, unknown>
}

function isWriteConflict(error: unknown) {
  const status = (error as VBaseError).response?.status

  return status === 409 || status === 412
}

function responseEtag(response: RawSnapshotResponse) {
  const etag = response.headers?.etag ?? response.headers?.ETag

  return typeof etag === 'string' && etag ? etag : undefined
}

function environmentName(workspace: string) {
  return workspace === 'master' ? 'production' : 'development'
}

function safeRequestId(requestId: string) {
  return requestId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'request'
}

function listedPath(file: ListedFile) {
  return file.path ?? file.name ?? null
}

export class VBaseFeedRepository implements FeedRepository {
  private readonly prefix: string

  constructor(private readonly vbase: VBase, workspace: string) {
    this.prefix = `${environmentName(workspace)}/`
  }

  private get latestPath() {
    return `${this.prefix}latest.json`
  }

  private async listPaths(prefix: string) {
    let next: string | undefined
    let paths: string[] = []

    for (let page = 0; page < MAX_LIST_PAGES; page++) {
      // VBase pagination is cursor-based, so each request depends on the prior one.
      // eslint-disable-next-line no-await-in-loop
      const result = await this.vbase.listFiles(BUCKET, {
        prefix,
        limit: PAGE_SIZE,
        ...(next ? { next } : {}),
      })

      paths = paths.concat(
        (result.data as ListedFile[])
          .map(listedPath)
          .filter((path): path is string => Boolean(path))
      )
      next = result.next || undefined

      if (!next) {
        break
      }
    }

    return paths
  }

  public async getLatest() {
    return this.vbase.getJSON<FeedSnapshot>(BUCKET, this.latestPath, true)
  }

  public async saveSnapshot(snapshot: FeedSnapshot, requestId: string) {
    const startedAt = new Date(snapshot.syncStartedAt).getTime()
    const path = `${this.prefix}snapshots/${startedAt}-${safeRequestId(
      requestId
    )}.json`

    await this.vbase.saveJSON(BUCKET, path, snapshot)

    for (let attempt = 0; attempt < MAX_LATEST_WRITE_ATTEMPTS; attempt++) {
      // Each retry reads the current ETag so replicas cannot blindly overwrite
      // a newer snapshot.
      // eslint-disable-next-line no-await-in-loop
      const current = (await this.vbase.getRawJSON<FeedSnapshot>(
        BUCKET,
        this.latestPath,
        true
      )) as RawSnapshotResponse

      if (
        current.data &&
        current.data.syncStartedAt >= snapshot.syncStartedAt
      ) {
        return
      }

      try {
        // VBase only accepts If-Match for an existing file. The first
        // development bootstrap is serialized by the protected sync route;
        // every subsequent update uses the ETag.
        // eslint-disable-next-line no-await-in-loop
        await this.vbase.saveJSON(
          BUCKET,
          this.latestPath,
          snapshot,
          undefined,
          responseEtag(current)
        )

        return
      } catch (error) {
        if (!isWriteConflict(error)) {
          throw error
        }
      }
    }

    throw Object.assign(new Error('Could not update latest feed snapshot'), {
      category: 'persistence' as const,
    })
  }

  public async saveMetadata(metadata: OperationalMetadata, requestId: string) {
    const attemptedAt = new Date(metadata.lastAttemptAt).getTime()
    const path = `${this.prefix}operations/${attemptedAt}-${safeRequestId(
      requestId
    )}.json`

    await this.vbase.saveJSON(BUCKET, path, metadata)
  }

  public async prune() {
    const groups = [
      { prefix: `${this.prefix}snapshots/`, keep: 64 },
      { prefix: `${this.prefix}operations/`, keep: 128 },
    ]

    await Promise.all(
      groups.map(async (group) => {
        const paths = (await this.listPaths(group.prefix)).sort((left, right) =>
          right.localeCompare(left)
        )

        await Promise.all(
          paths
            .slice(group.keep)
            .map((path) =>
              this.vbase.deleteFile(BUCKET, path).catch(() => undefined)
            )
        )
      })
    )
  }
}
