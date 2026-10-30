declare module 'vtex.css-handles' {
  interface CssHandlesBag<T extends readonly string[]> {
    handles: Record<T[number], string>
    withModifiers: (handle: T[number], modifier: string | string[]) => string
  }

  export function useCssHandles<T extends readonly string[]>(
    handles: T
  ): CssHandlesBag<T>
}
