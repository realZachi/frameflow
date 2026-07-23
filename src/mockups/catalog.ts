import iphone17AOverlay from '../assets/mockups/iphone-17-a.webp'
import iphone17BOverlay from '../assets/mockups/iphone-17-b.webp'
import iphone17COverlay from '../assets/mockups/iphone-17-c.webp'
import iphone17DOverlay from '../assets/mockups/iphone-17-d.webp'
import iphone17EOverlay from '../assets/mockups/iphone-17-e.webp'
import iphone17FOverlay from '../assets/mockups/iphone-17-f.webp'
import tiltedHandOverlay from '../assets/mockups/tilted-hand.webp'
import type { DeviceElement } from '../types'

export type DeviceStyle = DeviceElement['deviceStyle']

export type DevicePlacement = Pick<DeviceElement, 'x' | 'y' | 'width' | 'rotation'>

export type PhotoMockupDefinition = {
  overlay: string
  canvasAspectRatio: number
  sourceAspectRatio: number
  defaultPlacement: DevicePlacement
  screenMask?: {
    top: number
    right: number
    bottom: number
    left: number
    cornerRadius: number
  }
  screenQuad: [
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
    { x: number; y: number },
  ]
}

const iphoneScreenAspectRatio = 1206 / 2622
const iphone17ScreenMask = {
  top: 6 / 1532,
  right: 16 / 723,
  bottom: 13 / 1532,
  left: 7 / 723,
  cornerRadius: 100 / 723,
}

export const photoMockups: Record<DeviceStyle, PhotoMockupDefinition> = {
  'iphone-17-a': {
    overlay: iphone17AOverlay,
    canvasAspectRatio: 766 / 1574,
    sourceAspectRatio: iphoneScreenAspectRatio,
    defaultPlacement: { x: 18, y: 27, width: 64, rotation: 0 },
    screenMask: iphone17ScreenMask,
    screenQuad: [
      { x: 0.0365535248, y: 0.0152477764 },
      { x: 0.9804177546, y: 0.0152477764 },
      { x: 0.9804177546, y: 0.9885641677 },
      { x: 0.0365535248, y: 0.9885641677 },
    ],
  },
  'iphone-17-b': {
    overlay: iphone17BOverlay,
    canvasAspectRatio: 1188 / 2466,
    sourceAspectRatio: iphoneScreenAspectRatio,
    defaultPlacement: { x: 14, y: 20, width: 70, rotation: 0 },
    screenMask: iphone17ScreenMask,
    screenQuad: [
      { x: 0.0517982245, y: 0.011638699 },
      { x: 0.9829549348, y: 0.0180340754 },
      { x: 0.9816691591, y: 0.9885904108 },
      { x: 0.0597211036, y: 0.994080568 },
    ],
  },
  'iphone-17-c': {
    overlay: iphone17COverlay,
    canvasAspectRatio: 1917 / 1722,
    sourceAspectRatio: iphoneScreenAspectRatio,
    defaultPlacement: { x: -2, y: 44, width: 104, rotation: 0 },
    screenMask: iphone17ScreenMask,
    screenQuad: [
      { x: -0.0135055412, y: 0.2561793345 },
      { x: 0.3785134379, y: -0.0184953089 },
      { x: 1.0205608029, y: 0.6848975445 },
      { x: 0.6197227467, y: 0.9851055403 },
    ],
  },
  'iphone-17-d': {
    overlay: iphone17DOverlay,
    canvasAspectRatio: 1951 / 1673,
    sourceAspectRatio: iphoneScreenAspectRatio,
    defaultPlacement: { x: -4, y: 44, width: 108, rotation: 0 },
    screenMask: iphone17ScreenMask,
    screenQuad: [
      { x: 0.6108035531, y: -0.0158730201 },
      { x: 1.0154430061, y: 0.2070138297 },
      { x: 0.4062368155, y: 0.9757253166 },
      { x: -0.0132040862, y: 0.7142332742 },
    ],
  },
  'iphone-17-e': {
    overlay: iphone17EOverlay,
    canvasAspectRatio: 1803 / 1549,
    sourceAspectRatio: iphoneScreenAspectRatio,
    defaultPlacement: { x: -4, y: 45, width: 108, rotation: 0 },
    screenMask: iphone17ScreenMask,
    screenQuad: [
      { x: -0.0126050405, y: 0.1922883987 },
      { x: 0.4141827534, y: -0.0133224214 },
      { x: 1.0148008116, y: 0.7275228106 },
      { x: 0.5675096065, y: 0.9719397697 },
    ],
  },
  'iphone-17-f': {
    overlay: iphone17FOverlay,
    canvasAspectRatio: 1673 / 1664,
    sourceAspectRatio: iphoneScreenAspectRatio,
    defaultPlacement: { x: 0, y: 40, width: 100, rotation: 0 },
    screenMask: iphone17ScreenMask,
    screenQuad: [
      { x: 0.5181051797, y: 0.0010636078 },
      { x: 0.9920755055, y: 0.0438789118 },
      { x: 0.4700476861, y: 0.9595336225 },
      { x: -0.0149162126, y: 0.8998103536 },
    ],
  },
  'tilted-hand': {
    overlay: tiltedHandOverlay,
    canvasAspectRatio: 4409 / 3728,
    sourceAspectRatio: 1392 / 3017,
    defaultPlacement: { x: -7, y: 38, width: 114, rotation: 0 },
    screenQuad: [
      { x: (1615.4964150338822 - 1591) / 4409, y: (789.6513174904904 - 443) / 3728 },
      { x: (2735.824384213138 - 1591) / 4409, y: (439.4457765110928 - 443) / 3728 },
      { x: (4143.016848821205 - 1591) / 4409, y: (2860.8861566024875 - 443) / 3728 },
      { x: (3033.7505437034424 - 1591) / 4409, y: (3366.6787577701266 - 443) / 3728 },
    ],
  },
}

export const deviceOptions: { id: DeviceStyle; label: string; kind: 'photo'; preview: string }[] = [
  { id: 'iphone-17-a', label: '17 Pro · Aufrecht', kind: 'photo', preview: iphone17AOverlay },
  { id: 'iphone-17-b', label: '17 Pro · Frontal', kind: 'photo', preview: iphone17BOverlay },
  { id: 'iphone-17-c', label: '17 Pro · Rechts', kind: 'photo', preview: iphone17COverlay },
  { id: 'iphone-17-d', label: '17 Pro · Links', kind: 'photo', preview: iphone17DOverlay },
  { id: 'iphone-17-e', label: '17 Pro · Flach', kind: 'photo', preview: iphone17EOverlay },
  { id: 'iphone-17-f', label: '17 Pro · Angelehnt', kind: 'photo', preview: iphone17FOverlay },
  { id: 'tilted-hand', label: 'Hand · Tilted', kind: 'photo', preview: tiltedHandOverlay },
]

export const getDevicePlacement = (style: DeviceStyle) => photoMockups[style].defaultPlacement
