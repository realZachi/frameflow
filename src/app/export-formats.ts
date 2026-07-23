export const EXPORT_ARTBOARD_WIDTH = 330

export const EXPORT_FORMATS = [
  {
    id: 'iphone-6.9',
    label: '6.9-inch display',
    shortLabel: '6.9″',
    width: 1290,
    height: 2796,
    filename: '6.9-inch',
  },
  {
    id: 'iphone-6.5',
    label: '6.5-inch display',
    shortLabel: '6.5″',
    width: 1242,
    height: 2688,
    filename: '6.5-inch',
  },
] as const

export type ExportFormat = (typeof EXPORT_FORMATS)[number]
