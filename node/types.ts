export type FeedSource = 'meta' | 'fixture'
export type FeedMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'

export interface FeedItem {
  id: string
  mediaType: FeedMediaType
  coverUrl: string
  permalink: string
  publishedAt: string
  altText: string
}

export interface FeedSnapshot {
  items: FeedItem[]
  lastSyncedAt: string
  syncStartedAt: string
  source: FeedSource
}

export type SyncErrorCategory =
  | 'authentication'
  | 'rate-limit'
  | 'timeout'
  | 'upstream'
  | 'invalid-response'
  | 'configuration'
  | 'persistence'
  | null

export interface OperationalMetadata {
  lastAttemptAt: string
  lastSuccessAt: string | null
  itemCount: number
  lastErrorCategory: SyncErrorCategory
}

export interface MetaMedia {
  id?: unknown
  caption?: unknown
  media_type?: unknown
  media_url?: unknown
  thumbnail_url?: unknown
  permalink?: unknown
  timestamp?: unknown
  children?: {
    data?: MetaMedia[]
  }
}

export interface MetaMediaPage {
  data?: MetaMedia[]
  paging?: {
    cursors?: {
      after?: string
    }
  }
}

export interface MetaProfile {
  user_id?: unknown
  username?: unknown
}
