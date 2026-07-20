export type ToolId = 'templates' | 'device' | 'elements' | 'text' | 'background' | 'uploads'

export type BackgroundPattern = 'none' | 'dots' | 'grid' | 'diagonal' | 'waves'

export type Background = {
  type: 'solid' | 'gradient' | 'image'
  color1: string
  color2: string
  angle: number
  gradientKind?: 'linear' | 'radial'
  image?: string
  imageFit?: 'cover' | 'contain'
  imagePosition?: 'center' | 'top' | 'bottom'
  overlayColor?: string
  overlayOpacity?: number
  pattern?: BackgroundPattern
  patternColor?: string
  patternOpacity?: number
  patternScale?: number
}

export type BaseElement = {
  id: string
  x: number
  y: number
  width: number
  rotation: number
  opacity: number
  locked?: boolean
}

export type TextElement = BaseElement & {
  type: 'text'
  text: string
  color: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  align: 'left' | 'center' | 'right'
  lineHeight: number
  letterSpacing: number
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  textTransform?: 'none' | 'uppercase' | 'lowercase'
  backgroundColor?: string
  backgroundOpacity?: number
  padding?: number
  borderRadius?: number
  strokeColor?: string
  strokeWidth?: number
  shadow?: number
  shadowColor?: string
}

export type DeviceElement = BaseElement & {
  type: 'device'
  deviceStyle: 'midnight' | 'natural' | 'graphite' | 'android' | 'tilted-hand'
  screenshot?: string
  screenTheme: 'coral' | 'mint' | 'night' | 'sun'
  tiltX: number
  tiltY: number
  shadow: number
}

export type ImageElement = BaseElement & {
  type: 'image'
  src: string
  borderRadius: number
  shadow?: number
}

export type ShapeElement = BaseElement & {
  type: 'shape'
  shape:
    | 'circle'
    | 'square'
    | 'rounded-square'
    | 'pill'
    | 'triangle'
    | 'diamond'
    | 'star'
    | 'burst'
    | 'spark'
    | 'blob'
    | 'arch'
    | 'ring'
    | 'line'
    | 'arrow'
    | 'wave'
  color: string
  strokeColor?: string
  strokeWidth?: number
  shadow?: number
}

export type CanvasElement = TextElement | DeviceElement | ImageElement | ShapeElement

export type Slide = {
  id: string
  name: string
  background: Background
  elements: CanvasElement[]
}

export type UploadAsset = {
  id: string
  name: string
  src: string
}

export type TemplateId = 'ink' | 'paper' | 'lime' | 'coral'

export type TextPreset = 'title' | 'subtitle' | 'body' | 'label' | 'quote' | 'stat'
