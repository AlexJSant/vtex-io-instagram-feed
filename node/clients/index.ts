import { IOClients } from '@vtex/api'

import { InstagramClient } from './instagram'

export class Clients extends IOClients {
  public get instagram() {
    return this.getOrSet('instagram', InstagramClient)
  }
}
