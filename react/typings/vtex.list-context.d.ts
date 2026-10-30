declare module 'vtex.list-context' {
  import { FC, ReactNode } from 'react'

  export interface ListContextValue {
    list: ReactNode[]
  }

  export function useListContext(): ListContextValue | undefined

  export const ListContextProvider: FC<ListContextValue>
}
