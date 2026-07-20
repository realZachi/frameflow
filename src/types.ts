export type ToolId = 'templates' | 'device' | 'text' | 'background' | 'uploads'

export type Background = {
  type: 'solid' | 'gradient'
  color1: string
  color2: string
  angle: number
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
}

export type ShapeElement = BaseElement & {
  type: 'shape'
  shape: 'circle' | 'pill' | 'spark'
  color: string
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
