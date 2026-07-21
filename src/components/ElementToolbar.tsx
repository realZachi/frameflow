import { useRef, type ReactNode } from 'react'
import { fontOptions } from '../data'
import { deviceOptions, getDevicePlacement } from '../mockups/catalog'
import type { CanvasElement } from '../types'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  ChevronDown,
  Copy,
  ImagePlus,
  Italic,
  Lock,
  LockOpen,
  MonitorSmartphone,
  Shapes,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Upload,
} from './icons'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from './ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Separator } from './ui/separator'
import { Slider } from './ui/slider'

type Props = {
  element: CanvasElement
  onUpdate: (patch: Partial<CanvasElement>) => void
  onUploadToDevice: (file: File) => void
  onDuplicate: () => void
  onToggleLock: () => void
  onMoveLayer: (direction: -1 | 1) => void
  onDelete: () => void
}

const elementMeta: Record<CanvasElement['type'], { label: string; icon: ReactNode }> = {
  text: { label: 'Text', icon: <Type size={16} /> },
  device: { label: 'Mockup', icon: <MonitorSmartphone size={16} /> },
  shape: { label: 'Form', icon: <Shapes size={16} /> },
  image: { label: 'Bild', icon: <ImagePlus size={16} /> },
}

const ToolbarNumber = ({ label, value, min, max, step = 1, suffix, className, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  className?: string
  onChange: (value: number) => void
}) => (
  <label className={`toolbar-number${className ? ` ${className}` : ''}`} title={label}>
    <span>{label}</span>
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      value={Number.isInteger(value) ? value : Number(value.toFixed(2))}
      onChange={(event) => onChange(Number(event.target.value))}
      aria-label={label}
    />
    {suffix && <small>{suffix}</small>}
  </label>
)

const ToolbarColor = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="toolbar-color" title={label}>
    <input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} />
    <span style={{ backgroundColor: value }} />
    <small>{label}</small>
  </label>
)

const AdvancedSlider = ({ label, value, min, max, step = 1, displayValue, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  displayValue?: string
  onChange: (value: number) => void
}) => (
  <div className="toolbar-slider">
    <div><span>{label}</span><strong>{displayValue ?? value}</strong></div>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={(next) => onChange(typeof next === 'number' ? next : next[0])} aria-label={label} />
  </div>
)

const MoreSettings = ({ element, onUpdate }: Pick<Props, 'element' | 'onUpdate'>) => (
  <Popover>
    <PopoverTrigger render={<Button variant="outline" size="sm" className="toolbar-more" />}>
      Mehr <ChevronDown size={13} />
    </PopoverTrigger>
    <PopoverContent align="end" sideOffset={9} className="element-settings-popover">
      <PopoverHeader>
        <PopoverTitle>Weitere Einstellungen</PopoverTitle>
      </PopoverHeader>
      <div className="toolbar-popover-section">
        <AdvancedSlider label="Breite" value={element.width} min={8} max={140} displayValue={`${Math.round(element.width)}%`} onChange={(width) => onUpdate({ width })} />
        <AdvancedSlider label="Drehung" value={element.rotation} min={-180} max={180} displayValue={`${Math.round(element.rotation)}°`} onChange={(rotation) => onUpdate({ rotation })} />
        <AdvancedSlider label="Deckkraft" value={element.opacity} min={0.05} max={1} step={0.01} displayValue={`${Math.round(element.opacity * 100)}%`} onChange={(opacity) => onUpdate({ opacity })} />
      </div>

      {element.type === 'text' && (
        <div className="toolbar-popover-section">
          <strong className="toolbar-popover-heading">Textdetails</strong>
          <AdvancedSlider label="Zeilenhöhe" value={element.lineHeight} min={0.7} max={1.8} step={0.02} displayValue={element.lineHeight.toFixed(2)} onChange={(lineHeight) => onUpdate({ lineHeight })} />
          <AdvancedSlider label="Schriftstärke" value={element.fontWeight} min={100} max={900} step={50} onChange={(fontWeight) => onUpdate({ fontWeight })} />
          <div className="toolbar-transform-control">
            <span>Schreibweise</span>
            <div className="toolbar-button-group">
              <Button variant={(element.textTransform ?? 'none') === 'none' ? 'secondary' : 'ghost'} size="sm" onClick={() => onUpdate({ textTransform: 'none' })}>Aa</Button>
              <Button variant={element.textTransform === 'uppercase' ? 'secondary' : 'ghost'} size="sm" onClick={() => onUpdate({ textTransform: 'uppercase' })}>AA</Button>
              <Button variant={element.textTransform === 'lowercase' ? 'secondary' : 'ghost'} size="sm" onClick={() => onUpdate({ textTransform: 'lowercase' })}>aa</Button>
            </div>
          </div>
          <AdvancedSlider label="Laufweite" value={element.letterSpacing} min={-4} max={8} step={0.1} displayValue={`${element.letterSpacing.toFixed(1)} px`} onChange={(letterSpacing) => onUpdate({ letterSpacing })} />
          <ToolbarColor label="Textfläche" value={element.backgroundColor ?? '#ffffff'} onChange={(backgroundColor) => onUpdate({ backgroundColor })} />
          <AdvancedSlider label="Flächen-Deckkraft" value={element.backgroundOpacity ?? 0} min={0} max={1} step={0.01} displayValue={`${Math.round((element.backgroundOpacity ?? 0) * 100)}%`} onChange={(backgroundOpacity) => onUpdate({ backgroundOpacity })} />
          <AdvancedSlider label="Innenabstand" value={element.padding ?? 0} min={0} max={24} displayValue={`${element.padding ?? 0} px`} onChange={(padding) => onUpdate({ padding })} />
          <AdvancedSlider label="Ecken" value={element.borderRadius ?? 0} min={0} max={40} displayValue={`${element.borderRadius ?? 0} px`} onChange={(borderRadius) => onUpdate({ borderRadius })} />
          <ToolbarColor label="Kontur" value={element.strokeColor ?? '#111116'} onChange={(strokeColor) => onUpdate({ strokeColor })} />
          <AdvancedSlider label="Konturstärke" value={element.strokeWidth ?? 0} min={0} max={3} step={0.25} displayValue={`${element.strokeWidth ?? 0} px`} onChange={(strokeWidth) => onUpdate({ strokeWidth })} />
          <AdvancedSlider label="Textschatten" value={element.shadow ?? 0} min={0} max={100} displayValue={`${element.shadow ?? 0}%`} onChange={(shadow) => onUpdate({ shadow })} />
          <ToolbarColor label="Schattenfarbe" value={element.shadowColor ?? '#000000'} onChange={(shadowColor) => onUpdate({ shadowColor })} />
        </div>
      )}

      {element.type === 'shape' && (
        <div className="toolbar-popover-section">
          <strong className="toolbar-popover-heading">Formdetails</strong>
          <ToolbarColor label="Kontur" value={element.strokeColor ?? '#171713'} onChange={(strokeColor) => onUpdate({ strokeColor })} />
          <AdvancedSlider label="Konturstärke" value={element.strokeWidth ?? 0} min={0} max={12} displayValue={`${element.strokeWidth ?? 0} px`} onChange={(strokeWidth) => onUpdate({ strokeWidth })} />
          <AdvancedSlider label="Schatten" value={element.shadow ?? 0} min={0} max={100} displayValue={`${element.shadow ?? 0}%`} onChange={(shadow) => onUpdate({ shadow })} />
        </div>
      )}

      {element.type === 'image' && (
        <div className="toolbar-popover-section">
          <strong className="toolbar-popover-heading">Bilddetails</strong>
          <AdvancedSlider label="Ecken" value={element.borderRadius} min={0} max={50} displayValue={`${element.borderRadius}%`} onChange={(borderRadius) => onUpdate({ borderRadius })} />
          <AdvancedSlider label="Schatten" value={element.shadow ?? 32} min={0} max={100} displayValue={`${element.shadow ?? 32}%`} onChange={(shadow) => onUpdate({ shadow })} />
        </div>
      )}

      {element.type === 'device' && (
        <div className="toolbar-popover-section">
          <strong className="toolbar-popover-heading">Perspektive</strong>
          <AdvancedSlider label="Seitliche Neigung" value={element.tiltY} min={-18} max={18} displayValue={`${element.tiltY}°`} onChange={(tiltY) => onUpdate({ tiltY })} />
          <AdvancedSlider label="Vertikale Neigung" value={element.tiltX} min={-12} max={12} displayValue={`${element.tiltX}°`} onChange={(tiltX) => onUpdate({ tiltX })} />
          <AdvancedSlider label="Schatten" value={element.shadow} min={0} max={100} displayValue={`${element.shadow}%`} onChange={(shadow) => onUpdate({ shadow })} />
        </div>
      )}
    </PopoverContent>
  </Popover>
)

const TextControls = ({ element, onUpdate }: { element: Extract<CanvasElement, { type: 'text' }>; onUpdate: Props['onUpdate'] }) => {
  const fontCategories = [...new Set(fontOptions.map((font) => font.category))]
  return (
    <>
      <Select value={element.fontFamily} onValueChange={(fontFamily) => onUpdate({ fontFamily: String(fontFamily) })}>
        <SelectTrigger size="sm" className="toolbar-font" aria-label="Schriftfamilie">
          <SelectValue>{fontOptions.find((font) => font.value === element.fontFamily)?.name ?? element.fontFamily}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="toolbar-select-content">
          {fontCategories.map((category) => (
            <SelectGroup key={category}>
              <SelectLabel>{category}</SelectLabel>
              {fontOptions.filter((font) => font.category === category).map((font) => <SelectItem key={font.value} value={font.value}>{font.name}</SelectItem>)}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <ToolbarNumber label="Größe" value={element.fontSize} min={6} max={120} suffix="px" onChange={(fontSize) => onUpdate({ fontSize })} />
      <ToolbarNumber className="toolbar-text-weight" label="Stärke" value={element.fontWeight} min={100} max={900} step={50} onChange={(fontWeight) => onUpdate({ fontWeight })} />
      <ToolbarColor label="Textfarbe" value={element.color} onChange={(color) => onUpdate({ color })} />
      <div className="toolbar-button-group" aria-label="Textausrichtung">
        <Button variant={element.align === 'left' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => onUpdate({ align: 'left' })} aria-label="Linksbündig"><AlignLeft /></Button>
        <Button variant={element.align === 'center' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => onUpdate({ align: 'center' })} aria-label="Zentriert"><AlignCenter /></Button>
        <Button variant={element.align === 'right' ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => onUpdate({ align: 'right' })} aria-label="Rechtsbündig"><AlignRight /></Button>
      </div>
      <div className="toolbar-button-group" aria-label="Schriftschnitt">
        <Button variant={element.fontWeight >= 700 ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => onUpdate({ fontWeight: element.fontWeight >= 700 ? 500 : 760 })} aria-label="Fett" aria-pressed={element.fontWeight >= 700}><Bold /></Button>
        <Button variant={element.italic ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => onUpdate({ italic: !element.italic })} aria-label="Kursiv" aria-pressed={element.italic}><Italic /></Button>
        <Button variant={element.underline ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => onUpdate({ underline: !element.underline })} aria-label="Unterstrichen" aria-pressed={element.underline}><Underline /></Button>
        <Button variant={element.strikethrough ? 'secondary' : 'ghost'} size="icon-sm" onClick={() => onUpdate({ strikethrough: !element.strikethrough })} aria-label="Durchgestrichen" aria-pressed={element.strikethrough}><Strikethrough /></Button>
      </div>
    </>
  )
}

const DeviceControls = ({ element, onUpdate, onUpload }: {
  element: Extract<CanvasElement, { type: 'device' }>
  onUpdate: Props['onUpdate']
  onUpload: (file: File) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <Select value={element.deviceStyle} onValueChange={(value) => {
        const deviceStyle = value as typeof element.deviceStyle
        onUpdate({ deviceStyle, ...getDevicePlacement(deviceStyle) })
      }}>
        <SelectTrigger size="sm" className="toolbar-device-select" aria-label="Mockup-Stil">
          <SelectValue>{deviceOptions.find((device) => device.id === element.deviceStyle)?.label ?? element.deviceStyle}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          {deviceOptions.map((device) => <SelectItem key={device.id} value={device.id}>{device.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        {element.screenshot ? <ImagePlus /> : <Upload />}
        {element.screenshot ? 'Screenshot ersetzen' : 'Screenshot einsetzen'}
      </Button>
      <ToolbarNumber label="Schatten" value={element.shadow} min={0} max={100} suffix="%" onChange={(shadow) => onUpdate({ shadow })} />
    </>
  )
}

export const ElementToolbar = ({ element, onUpdate, onUploadToDevice, onDuplicate, onToggleLock, onMoveLayer, onDelete }: Props) => {
  const meta = elementMeta[element.type]
  return (
    <div className="context-toolbar" role="toolbar" aria-label={`${meta.label} bearbeiten`}>
      <div className="context-toolbar-identity">
        <span>{meta.icon}</span>
        <div><strong>{meta.label}</strong><small>Ausgewählt</small></div>
      </div>
      <div className="context-toolbar-controls">
        {element.type === 'text' && <TextControls element={element} onUpdate={onUpdate} />}
        {element.type === 'shape' && (
          <>
            <ToolbarColor label="Füllung" value={element.color} onChange={(color) => onUpdate({ color })} />
            <ToolbarColor label="Kontur" value={element.strokeColor ?? '#171713'} onChange={(strokeColor) => onUpdate({ strokeColor })} />
            <ToolbarNumber label="Kontur" value={element.strokeWidth ?? 0} min={0} max={12} suffix="px" onChange={(strokeWidth) => onUpdate({ strokeWidth })} />
            <ToolbarNumber label="Schatten" value={element.shadow ?? 0} min={0} max={100} suffix="%" onChange={(shadow) => onUpdate({ shadow })} />
          </>
        )}
        {element.type === 'image' && (
          <>
            <ToolbarNumber label="Ecken" value={element.borderRadius} min={0} max={50} suffix="%" onChange={(borderRadius) => onUpdate({ borderRadius })} />
            <ToolbarNumber label="Schatten" value={element.shadow ?? 32} min={0} max={100} suffix="%" onChange={(shadow) => onUpdate({ shadow })} />
            <ToolbarNumber label="Deckkraft" value={Math.round(element.opacity * 100)} min={5} max={100} suffix="%" onChange={(opacity) => onUpdate({ opacity: opacity / 100 })} />
          </>
        )}
        {element.type === 'device' && <DeviceControls element={element} onUpdate={onUpdate} onUpload={onUploadToDevice} />}
        <MoreSettings element={element} onUpdate={onUpdate} />
      </div>
      <div className="context-toolbar-actions">
        <Separator orientation="vertical" />
        <Button variant="ghost" size="icon-sm" onClick={onDuplicate} title="Duplizieren" aria-label="Duplizieren"><Copy /></Button>
        <Button variant={element.locked ? 'secondary' : 'ghost'} size="icon-sm" onClick={onToggleLock} title={element.locked ? 'Entsperren' : 'Sperren'} aria-label={element.locked ? 'Entsperren' : 'Sperren'}>
          {element.locked ? <LockOpen /> : <Lock />}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => onMoveLayer(-1)} title="Eine Ebene nach hinten" aria-label="Eine Ebene nach hinten"><ArrowDown /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => onMoveLayer(1)} title="Eine Ebene nach vorne" aria-label="Eine Ebene nach vorne"><ArrowUp /></Button>
        <Button variant="destructive" size="icon-sm" onClick={onDelete} title="Löschen" aria-label="Löschen"><Trash2 /></Button>
      </div>
    </div>
  )
}
