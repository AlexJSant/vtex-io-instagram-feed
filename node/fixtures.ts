import type { FeedItem } from './types'

export const DEVELOPMENT_FIXTURES: FeedItem[] = Array.from(
  { length: 5 },
  (_, index) => ({
    id: `development-fixture-${index + 1}`,
    mediaType: 'IMAGE',
    coverUrl: `https://placehold.co/800x1000/eeeeee/555555?text=Fixture+${
      index + 1
    }`,
    permalink: 'https://www.instagram.com/sunhousemoveis/',
    publishedAt: new Date(Date.UTC(2026, 9, 20, 12 - index)).toISOString(),
    altText: `Imagem de demonstração ${index + 1}`,
  })
)
