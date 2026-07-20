import tiltedHandOverlay from '../assets/mockups/tilted-hand.webp'
import type { DeviceElement } from '../types'

export type DeviceStyle = DeviceElement['deviceStyle']

export const deviceOptions: Array<{ id: DeviceStyle; label: string; kind: 'css' | 'photo' }> = [
  { id: 'midnight', label: 'iPhone · Nacht', kind: 'css' },
  { id: 'natural', label: 'iPhone · Titan', kind: 'css' },
  { id: 'graphite', label: 'iPhone · Graphit', kind: 'css' },
  { id: 'android', label: 'Android · Obsidian', kind: 'css' },
  { id: 'tilted-hand', label: 'Hand · Tilted', kind: 'photo' },
]

export type PhotoMockupDefinition = {
  overlay: string
  canvasAspectRatio: number
  sourceAspectRatio: number
  screenQuad: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
  ]
}

export const photoMockups: Partial<Record<DeviceStyle, PhotoMockupDefinition>> = {
  'tilted-hand': {
    overlay: tiltedHandOverlay,
    canvasAspectRatio: 4409 / 3728,
    sourceAspectRatio: 1392 / 3017,
    // Smart-object transform coordinates normalized against the transparent crop.
    screenQuad: [
      { x: (1615.4964150338822 - 1591) / 4409, y: (789.6513174904904 - 443) / 3728 },
      { x: (2735.824384213138 - 1591) / 4409, y: (439.4457765110928 - 443) / 3728 },
      { x: (4143.016848821205 - 1591) / 4409, y: (2860.8861566024875 - 443) / 3728 },
      { x: (3033.7505437034424 - 1591) / 4409, y: (3366.6787577701266 - 443) / 3728 },
    ],
  },
}
