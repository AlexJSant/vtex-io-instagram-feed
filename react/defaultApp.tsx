import React, { useMemo, useState } from 'react'
import { useQuery } from 'react-apollo'
import { useCssHandles } from 'vtex.css-handles'
import { ListContextProvider, useListContext } from 'vtex.list-context'

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
  children?: React.ReactNode
}

const CSS_HANDLES = [
  'container',
  'heading',
  'title',
  'carousel',
  'card',
  'cardLink',
  'cardOverlay',
  'cardOverlayButton',
  'image',
  'fixedCard',
  'fixedCardText',
  'fixedCardButton',
  'fixedCardIcon',
  'skeleton',
  'skeletonCard',
  'placeholder',
  'developmentNotice',
] as const

const DEFAULT_TITLE = 'Acompanhe a Sun House no Instagram'
const FIXED_POST_URL = 'https://www.instagram.com/sunhousemoveis/'
const SKELETON_ITEMS = [0, 1, 2, 3]

const VTEX_BUTTON_CLASSES = [
  'vtex-button',
  'bw1',
  'ba',
  'fw5',
  'v-mid',
  'relative',
  'pa0',
  'lh-solid',
  'br2',
  'min-h-regular',
  't-action',
  'bg-action-primary',
  'b--action-primary',
  'c-on-action-primary',
  'hover-bg-action-primary',
  'hover-b--action-primary',
  'hover-c-on-action-primary',
  'pointer',
  'inline-flex',
  'items-center',
  'no-underline',
].join(' ')

const VTEX_BUTTON_LABEL_CLASSES =
  'vtex-button__label flex items-center justify-center h-100 ph6'

function VtexLinkButton({
  className,
  href,
  children,
}: {
  className: string
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      className={`${VTEX_BUTTON_CLASSES} ${className}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className={VTEX_BUTTON_LABEL_CLASSES}>{children}</div>
    </a>
  )
}

function ExternalTabIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9.5 2a.75.75 0 0 0 0 1.5h1.69L6.22 8.47a.75.75 0 1 0 1.06 1.06l4.97-4.97V6.5a.75.75 0 0 0 1.5 0v-4a.75.75 0 0 0-.75-.75h-4z" />
      <path d="M4.25 3.5A1.75 1.75 0 0 0 2.5 5.25v6.5c0 .966.784 1.75 1.75 1.75h6.5a1.75 1.75 0 0 0 1.75-1.75V9a.75.75 0 0 0-1.5 0v2.75a.25.25 0 0 1-.25.25h-6.5a.25.25 0 0 1-.25-.25v-6.5a.25.25 0 0 1 .25-.25H7a.75.75 0 0 0 0-1.5H4.25z" />
    </svg>
  )
}

function FeedSkeleton({ title }: { title: string }) {
  const { handles } = useCssHandles(CSS_HANDLES)

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
  children,
}: Props) {
  const { handles } = useCssHandles(CSS_HANDLES)
  const parentList = useListContext()?.list ?? []
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

  const feedSlides = [
    ...items.map((item) => (
      <div className={`${handles.card} ${styles.card}`} key={item.id}>
        <a
          className={`${handles.cardLink} ${styles.cardLink}`}
          href={item.permalink}
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
        <div className={`${handles.cardOverlay} ${styles.cardOverlay}`}>
          <VtexLinkButton
            className={handles.cardOverlayButton}
            href={item.permalink}
          >
            ver no instagram
          </VtexLinkButton>
        </div>
      </div>
    )),
    <div
      className={`${handles.fixedCard} ${handles.card} ${styles.card}`}
      key="fixed-post"
    >
      <p className={`${handles.fixedCardText} ${styles.fixedCardText}`}>
        Veja mais diretamente no Instagram
      </p>
      <VtexLinkButton className={handles.fixedCardButton} href={FIXED_POST_URL}>
        Ver mais
        <ExternalTabIcon
          className={`${handles.fixedCardIcon} ${styles.fixedCardIcon}`}
        />
      </VtexLinkButton>
    </div>,
  ]

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
      <ListContextProvider list={parentList.concat(feedSlides)}>
        {children}
      </ListContextProvider>
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
