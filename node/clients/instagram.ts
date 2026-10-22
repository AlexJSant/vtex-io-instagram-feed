import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

import type { MetaMediaPage, MetaProfile } from '../types'

const META_ORIGIN = 'https://graph.instagram.com'
const MEDIA_PATH = '/v25.0/me/media'
const MEDIA_FIELDS =
  'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}'

export class InstagramClient extends ExternalClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(META_ORIGIN, context, options)
  }

  public getProfile(accessToken: string) {
    return this.http.get<MetaProfile>('/v25.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        fields: 'user_id,username',
      },
      metric: 'instagram-feed-profile',
    })
  }

  public getMedia(accessToken: string, after?: string) {
    return this.http.get<MetaMediaPage>(MEDIA_PATH, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        limit: 8,
        fields: MEDIA_FIELDS,
        ...(after ? { after } : {}),
      },
      metric: 'instagram-feed-media',
    })
  }
}
