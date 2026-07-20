import type { ShapeElement } from './types'

export const shapeCatalog: Array<{
  id: ShapeElement['shape']
  label: string
  group: 'Basis' | 'Akzent' | 'Linien'
}> = [
  { id: 'circle', label: 'Kreis', group: 'Basis' },
  { id: 'square', label: 'Quadrat', group: 'Basis' },
  { id: 'rounded-square', label: 'Soft Square', group: 'Basis' },
  { id: 'pill', label: 'Pill', group: 'Basis' },
  { id: 'triangle', label: 'Dreieck', group: 'Basis' },
  { id: 'diamond', label: 'Raute', group: 'Basis' },
  { id: 'star', label: 'Stern', group: 'Akzent' },
  { id: 'burst', label: 'Burst', group: 'Akzent' },
  { id: 'spark', label: 'Spark', group: 'Akzent' },
  { id: 'blob', label: 'Blob', group: 'Akzent' },
  { id: 'arch', label: 'Bogen', group: 'Akzent' },
  { id: 'ring', label: 'Ring', group: 'Akzent' },
  { id: 'line', label: 'Linie', group: 'Linien' },
  { id: 'arrow', label: 'Pfeil', group: 'Linien' },
  { id: 'wave', label: 'Welle', group: 'Linien' },
]

export const shapeAspectRatio: Record<ShapeElement['shape'], number> = {
  circle: 1,
  square: 1,
  'rounded-square': 1,
  pill: 3.2,
  triangle: 1,
  diamond: 1,
  star: 1,
  burst: 1,
  spark: 1,
  blob: 1,
  arch: 1,
  ring: 1,
  line: 4,
  arrow: 2.4,
  wave: 3.2,
}
