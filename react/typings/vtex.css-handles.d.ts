declare module 'vtex.css-handles' {
  export function useCssHandles<T extends readonly string[]>(
    handles: T
  ): Record<T[number], string>
}
