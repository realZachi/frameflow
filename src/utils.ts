import type { CSSProperties } from 'react'
import type { Background } from './types'

export const uid = (prefix = 'item') => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '')
  const bigint = Number.parseInt(normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const getBackgroundStyle = (background: Background): CSSProperties => {
  if (background.type === 'image') {
    const overlay = hexToRgba(background.overlayColor ?? '#111116', clamp(background.overlayOpacity ?? 0.18, 0, 1))
    const image = background.image ? `url("${background.image}")` : 'none'
    return {
      backgroundColor: background.color1,
      backgroundImage: `linear-gradient(${overlay}, ${overlay}), ${image}`,
      backgroundSize: `cover, ${background.imageFit ?? 'cover'}`,
      backgroundPosition: `center, ${background.imagePosition ?? 'center'}`,
      backgroundRepeat: 'no-repeat',
    }
  }

  if (background.type === 'gradient') {
    return {
      backgroundColor: background.color1,
      backgroundImage: background.gradientKind === 'radial'
        ? `radial-gradient(circle at 24% 18%, ${background.color1}, ${background.color2} 78%)`
        : `linear-gradient(${background.angle}deg, ${background.color1}, ${background.color2})`,
    }
  }

  return { backgroundColor: background.color1 }
}

export const getBackgroundPatternStyle = (background: Background): CSSProperties => ({
  '--pattern-color': hexToRgba(background.patternColor ?? '#ffffff', clamp(background.patternOpacity ?? 0.12, 0, 0.8)),
  '--pattern-size': `${clamp(background.patternScale ?? 28, 10, 80)}px`,
} as CSSProperties)
