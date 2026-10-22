import type { FeedItem, FeedMediaType, MetaMedia } from './types'

const MAX_ITEMS = 8
const MAX_ALT_LENGTH = 180
const SUPPORTED_TYPES = new Set<FeedMediaType>([
  'IMAGE',
  'VIDEO',
  'CAROUSEL_ALBUM',
])

function asHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  try {
    const url = new URL(value)

    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function asInstagramPermalink(value: unknown): string | null {
  const parsed = asHttpsUrl(value)

  if (!parsed) {
    return null
  }

  const hostname = new URL(parsed).hostname.toLowerCase()

  return hostname === 'instagram.com' || hostname.endsWith('.instagram.com')
    ? parsed
    : null
}

function coverFor(media: MetaMedia, mediaType: FeedMediaType) {
  if (mediaType === 'VIDEO') {
    return asHttpsUrl(media.thumbnail_url)
  }

  if (mediaType === 'IMAGE') {
    return asHttpsUrl(media.media_url)
  }

  const firstChild = media.children?.data?.[0]

  if (!firstChild) {
    return null
  }

  return firstChild.media_type === 'VIDEO'
    ? asHttpsUrl(firstChild.thumbnail_url)
    : asHttpsUrl(firstChild.media_url)
}

function altText(caption: unknown) {
  if (typeof caption !== 'string') {
    return 'Publicação da Sun House no Instagram'
  }

  const plainText = caption.replace(/\s+/g, ' ').trim()

  if (!plainText) {
    return 'Publicação da Sun House no Instagram'
  }

  return plainText.length > MAX_ALT_LENGTH
    ? `${plainText.slice(0, MAX_ALT_LENGTH - 1).trimEnd()}…`
    : plainText
}

function normalizeItem(media: MetaMedia): FeedItem | null {
  if (
    typeof media.id !== 'string' ||
    typeof media.media_type !== 'string' ||
    !SUPPORTED_TYPES.has(media.media_type as FeedMediaType)
  ) {
    return null
  }

  const mediaType = media.media_type as FeedMediaType
  const coverUrl = coverFor(media, mediaType)
  const permalink = asInstagramPermalink(media.permalink)
  const publishedAt =
    typeof media.timestamp === 'string'
      ? new Date(media.timestamp).toISOString()
      : null

  if (!coverUrl || !permalink || !publishedAt) {
    return null
  }

  return {
    id: media.id,
    mediaType,
    coverUrl,
    permalink,
    publishedAt,
    altText: altText(media.caption),
  }
}

export function normalizeMedia(media: MetaMedia[]): FeedItem[] {
  const uniqueItems = new Map<string, FeedItem>()

  for (const rawItem of media) {
    try {
      const item = normalizeItem(rawItem)

      if (!item || uniqueItems.has(item.id)) {
        continue
      }

      uniqueItems.set(item.id, item)
    } catch {
      continue
    }
  }

  return [...uniqueItems.values()]
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    .slice(0, MAX_ITEMS)
}
