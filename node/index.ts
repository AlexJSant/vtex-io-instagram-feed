import type { ClientsConfig, RecorderState, ServiceContext } from '@vtex/api'
import { Service } from '@vtex/api'

import { Clients } from './clients'
import { instagramFeed } from './resolvers/instagramFeed'
import { routes } from './routes'

const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    default: {
      retries: 1,
      timeout: 3000,
    },
    instagram: {
      retries: 2,
      timeout: 4000,
      exponentialBackoffCoefficient: 2,
      exponentialTimeoutCoefficient: 1,
      initialBackoffDelay: 250,
    },
  },
}

declare global {
  type Context = ServiceContext<Clients, State>
  type State = RecorderState
}

export default new Service({
  clients,
  graphql: {
    resolvers: {
      Query: {
        instagramFeed,
      },
    },
  },
  routes,
})
