import { HugeiconsIcon } from '@hugeicons/react'
import { getIcon } from '../icons'
import { ToolbarColor, ToolbarRange, type Props } from './ElementToolbar'
import { IconPicker } from './IconPicker'
import { ChevronDown, Sparkles } from './icons'
import { percentPresets } from './toolbar-shared'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from './ui/popover'
import type { CanvasElement } from '../types'

export const IconSettings = ({ element, onUpdate }: {
  element: Extract<CanvasElement, { type: 'icon' }>
  onUpdate: Props['onUpdate']
}) => (
  <div className="toolbar-popover-section">
    <strong className="toolbar-popover-heading">Icon details</strong>
    <ToolbarRange label="Stroke width" value={element.strokeWidth ?? 1.5} min={1} max={3} step={0.25} displayValue={`${element.strokeWidth ?? 1.5}`} onChange={(strokeWidth) => onUpdate({ strokeWidth })} />
    <ToolbarRange label="Shadow" value={element.shadow ?? 0} min={0} max={100} displayValue={`${element.shadow ?? 0}%`} onChange={(shadow) => onUpdate({ shadow })} />
  </div>
)

export const IconControls = ({ element, onUpdate }: {
  element: Extract<CanvasElement, { type: 'icon' }>
  onUpdate: Props['onUpdate']
}) => {
  const currentIcon = getIcon(element.icon)
  return (
    <>
      <Popover>
        <PopoverTrigger render={<Button variant="outline" size="sm" className="toolbar-icon-select" aria-label="Change icon" />}>
          {currentIcon ? <HugeiconsIcon icon={currentIcon} size={15} primaryColor="currentColor" /> : <Sparkles size={15} />}
          <span>Icon</span>
          <ChevronDown className="toolbar-control-chevron" />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={9} className="icon-picker-popover">
          <PopoverHeader><PopoverTitle>Choose icon</PopoverTitle></PopoverHeader>
          <IconPicker onSelect={(icon) => onUpdate({ icon })} selectedIcon={element.icon} />
        </PopoverContent>
      </Popover>
      <ToolbarColor label="Color" value={element.color} onChange={(color) => onUpdate({ color })} />
      <ToolbarRange
        label="Stroke"
        value={element.strokeWidth ?? 1.5}
        min={1}
        max={3}
        step={0.25}
        displayValue={`${element.strokeWidth ?? 1.5}`}
        presets={[
          { label: 'Thin', value: 1 },
          { label: 'Default', value: 1.5 },
          { label: 'Bold', value: 2 },
          { label: 'Max', value: 3 },
        ]}
        onChange={(strokeWidth) => onUpdate({ strokeWidth })}
      />
      <ToolbarRange label="Shadow" value={element.shadow ?? 0} min={0} max={100} displayValue={`${Math.round(element.shadow ?? 0)}%`} presets={percentPresets} onChange={(shadow) => onUpdate({ shadow })} />
    </>
  )
}
