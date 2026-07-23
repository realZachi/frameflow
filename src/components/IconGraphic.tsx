import { HugeiconsIcon } from '@hugeicons/react'
import { getIcon } from '../icons'
import type { IconElement } from '../types'
import type { CSSProperties } from 'react'

export const IconGraphic = ({ element, className = '' }: { element: IconElement; className?: string }) => {
  const icon = getIcon(element.icon)
  const shadow = element.shadow ?? 0
  const style = {
    width: '100%',
    height: 'auto',
    aspectRatio: '1',
    filter: shadow > 0
      ? `drop-shadow(0 ${Math.max(1, shadow * 0.035)}px ${Math.max(2, shadow * 0.1)}px rgba(0, 0, 0, ${Math.min(0.38, shadow * 0.004)}))`
      : undefined,
  } as CSSProperties

  if (!icon) return null

  return (
    <div className={`canvas-icon${className ? ` ${className}` : ''}`} style={style}>
      <HugeiconsIcon
        icon={icon}
        primaryColor={element.color}
        strokeWidth={element.strokeWidth ?? 1.5}
        size="100%"
      />
    </div>
  )
}
