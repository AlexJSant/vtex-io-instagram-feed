import { normalizeMedia } from '../normalize'
import type { MetaMedia } from '../types'

function image(id: string, timestamp: string): MetaMedia {
  return {
    id,
    media_type: 'IMAGE',
    media_url: `https://cdn.example.com/${id}.jpg`,
    permalink: `https://www.instagram.com/p/${id}/`,
    timestamp,
    caption: `Publicação ${id}`,
  }
}

describe('normalizeMedia', () => {
  it('sorts, removes duplicates and limits the feed to eight unique posts', () => {
    const media = Array.from({ length: 10 }, (_, index) =>
      image(String(index), new Date(Date.UTC(2026, 9, index + 1)).toISOString())
    )

    media.push(media[9])

    const result = normalizeMedia(media)

    expect(result).toHaveLength(8)
    expect(result.map((item) => item.id)).toEqual([
      '9',
      '8',
      '7',
      '6',
      '5',
      '4',
      '3',
      '2',
    ])
  })

  it('uses the first album child and a video thumbnail as its cover', () => {
    const result = normalizeMedia([
      {
        id: 'album',
        media_type: 'CAROUSEL_ALBUM',
        permalink: 'https://www.instagram.com/p/album/',
        timestamp: '2026-10-20T10:00:00Z',
        children: {
          data: [
            {
              id: 'child',
              media_type: 'VIDEO',
              media_url: 'https://cdn.example.com/video.mp4',
              thumbnail_url: 'https://cdn.example.com/thumbnail.jpg',
            },
          ],
        },
      },
    ])

    expect(result).toHaveLength(1)
    expect(result[0].coverUrl).toBe('https://cdn.example.com/thumbnail.jpg')
  })

  it('discards videos without thumbnails and unsafe permalinks', () => {
    const result = normalizeMedia([
      {
        id: 'video',
        media_type: 'VIDEO',
        media_url: 'https://cdn.example.com/video.mp4',
        permalink: 'https://www.instagram.com/reel/video/',
        timestamp: '2026-10-20T10:00:00Z',
      },
      {
        ...image('unsafe', '2026-10-20T10:00:00Z'),
        permalink: 'https://example.com/not-instagram',
      },
    ])

    expect(result).toEqual([])
  })
})
