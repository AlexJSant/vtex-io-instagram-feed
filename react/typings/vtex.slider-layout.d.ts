declare module 'vtex.slider-layout/SliderLayout' {
  interface SliderLayoutProps {
    children?: JSX.Element | JSX.Element[]
    label?: string
    itemsPerPage?: {
      desktop: number
      tablet: number
      phone: number
    }
    navigationStep?: number | 'page'
    infinite?: boolean
    showNavigationArrows?: 'always' | 'never' | 'desktopOnly' | 'mobileOnly'
    showPaginationDots?: 'always' | 'never' | 'desktopOnly' | 'mobileOnly'
    autoplay?: {
      timeout: number
      stopOnHover: boolean
    }
    fullWidth?: boolean
    slideTransition?: {
      speed: number
      delay: number
      timing: string
    }
  }

  const SliderLayout: (props: SliderLayoutProps) => JSX.Element

  export default SliderLayout
}
