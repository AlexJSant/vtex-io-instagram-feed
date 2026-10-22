import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from 'react-apollo'
import { useCssHandles } from 'vtex.css-handles'
import SliderLayout from 'vtex.slider-layout/SliderLayout'

import INSTAGRAM_FEED_QUERY from './graphql/instagramFeed.gql'
import styles from './styles.css'

type FeedSource = 'meta' | 'fixture'

interface FeedItem {
  id: string
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  coverUrl: string
  permalink: string
  publishedAt: string
  altText: string
}

interface FeedResponse {
  items: FeedItem[]
  lastSyncedAt: string | null
  source: FeedSource
}

interface InstagramFeedQueryData {
  instagramFeed: FeedResponse
}

interface Props {
  title?: string
  allowDevelopmentFixtures?: boolean
}

const CSS_HANDLES = [
  'container',
  'heading',
  'title',
  'carousel',
  'card',
  'image',
  'skeleton',
  'skeletonCard',
  'placeholder',
  'developmentNotice',
] as const

const DEFAULT_TITLE = 'Acompanhe a Sun House no Instagram'
const SKELETON_ITEMS = [0, 1, 2, 3]

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(mediaQuery.matches)

    updatePreference()
    mediaQuery.addListener(updatePreference)

    return () => mediaQuery.removeListener(updatePreference)
  }, [])

  return reducedMotion
}

function FeedSkeleton({ title }: { title: string }) {
  const handles = useCssHandles(CSS_HANDLES)

  return (
    <section
      className={`${handles.container} ${styles.container} ${handles.skeleton} ${styles.skeleton}`}
      aria-label={title}
      aria-busy="true"
    >
      <div className={`${handles.heading} ${styles.heading}`}>
        <h2 className={`${handles.title} ${styles.title}`}>{title}</h2>
      </div>
      <div className={`${handles.carousel} ${styles.carousel}`}>
        {SKELETON_ITEMS.map((item) => (
          <div
            className={`${handles.skeletonCard} ${styles.skeletonCard}`}
            aria-hidden="true"
            key={item}
          />
        ))}
      </div>
    </section>
  )
}

function InstagramFeed({
  title = DEFAULT_TITLE,
  allowDevelopmentFixtures = false,
}: Props) {
  const handles = useCssHandles(CSS_HANDLES)
  const reducedMotion = useReducedMotion()
  const [invalidItems, setInvalidItems] = useState<string[]>([])
  const { data, error, loading } = useQuery<InstagramFeedQueryData>(
    INSTAGRAM_FEED_QUERY,
    { fetchPolicy: 'cache-first' }
  )
  const feed = data?.instagramFeed ?? null

  const items = useMemo(
    () =>
      (feed?.items ?? [])
        .filter((item) => !invalidItems.includes(item.id))
        .slice(0, 8),
    [feed, invalidItems]
  )

  if (loading) {
    return <FeedSkeleton title={title} />
  }

  const fixtureBlocked = feed?.source === 'fixture' && !allowDevelopmentFixtures

  if (error || !feed || fixtureBlocked || items.length === 0) {
    const state = error
      ? 'query-error'
      : !feed
      ? 'missing-feed'
      : fixtureBlocked
      ? 'fixture-blocked'
      : 'empty'

    return (
      <div
        className={`${handles.placeholder} ${styles.placeholder}`}
        aria-hidden="true"
        data-feed-state={state}
      />
    )
  }

  const isScrollable = items.length > 4

  return (
    <section
      className={`${handles.container} ${styles.container}`}
      aria-label={title}
    >
      <div className={`${handles.heading} ${styles.heading}`}>
        <h2 className={`${handles.title} ${styles.title}`}>{title}</h2>
        {feed.source === 'fixture' && (
          <span
            className={`${handles.developmentNotice} ${styles.developmentNotice}`}
          >
            Dados de demonstração
          </span>
        )}
      </div>
      <SliderLayout
        label="Publicações da Sun House no Instagram"
        itemsPerPage={{
          desktop: Math.min(4, items.length),
          tablet: Math.min(2, items.length),
          phone: items.length > 1 ? 1.15 : 1,
        }}
        navigationStep={1}
        infinite={isScrollable}
        showNavigationArrows={isScrollable ? 'always' : 'never'}
        showPaginationDots="never"
        autoplay={undefined}
        fullWidth={false}
        slideTransition={{
          speed: reducedMotion ? 0 : 400,
          delay: 0,
          timing: 'ease',
        }}
      >
        {items.map((item) => (
          <a
            className={`${handles.card} ${styles.card}`}
            href={item.permalink}
            key={item.id}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.altText} (abre em uma nova aba)`}
          >
            <img
              className={`${handles.image} ${styles.image}`}
              src={item.coverUrl}
              alt={item.altText}
              loading="lazy"
              decoding="async"
              onError={() =>
                setInvalidItems((current) =>
                  current.includes(item.id) ? current : [...current, item.id]
                )
              }
            />
          </a>
        ))}
      </SliderLayout>
    </section>
  )
}

InstagramFeed.schema = {
  title: 'Feed do Instagram',
  description: 'Exibe as publicações persistidas do Instagram da Sun House.',
  type: 'object',
  properties: {
    title: {
      title: 'Título',
      type: 'string',
      default: DEFAULT_TITLE,
    },
    allowDevelopmentFixtures: {
      title: 'Permitir fixtures de desenvolvimento',
      description:
        'Exibe dados de demonstração identificados. Mantenha desativado fora do desenvolvimento.',
      type: 'boolean',
      default: false,
    },
  },
}

export default InstagramFeed
