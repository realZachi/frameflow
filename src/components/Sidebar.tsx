import { useRef, type ChangeEvent, type ReactNode } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Blend,
  Bold,
  Check,
  ChevronDown,
  ImagePlus,
  Italic,
  Layers3,
  MonitorSmartphone,
  Palette,
  Plus,
  Shapes,
  Sparkles,
  Strikethrough,
  Type,
  Underline,
  Upload,
} from 'lucide-react'
import { fontOptions, templateMeta } from '../data'
import type { Background, BackgroundPattern, CanvasElement, ShapeElement, Slide, TemplateId, TextPreset, ToolId, UploadAsset } from '../types'
import { deviceOptions } from '../mockups/catalog'
import { shapeCatalog } from '../shapes'
import { getBackgroundPatternStyle, getBackgroundStyle } from '../utils'
import { ShapeGraphic } from './ShapeGraphic'

const tools: Array<{ id: ToolId; label: string; icon: ReactNode }> = [
  { id: 'templates', label: 'Vorlagen', icon: <Sparkles size={19} /> },
  { id: 'device', label: 'Mockups', icon: <MonitorSmartphone size={19} /> },
  { id: 'elements', label: 'Elemente', icon: <Shapes size={19} /> },
  { id: 'text', label: 'Text', icon: <Type size={19} /> },
  { id: 'background', label: 'Hintergrund', icon: <Palette size={19} /> },
  { id: 'uploads', label: 'Uploads', icon: <Upload size={19} /> },
]

export const ToolRail = ({ activeTool, onChange }: { activeTool: ToolId; onChange: (tool: ToolId) => void }) => (
  <nav className="tool-rail" aria-label="Editor-Werkzeuge">
    <div className="rail-mark"><span>F</span></div>
    <div className="rail-tools">
      {tools.map((tool) => (
        <button key={tool.id} className={activeTool === tool.id ? 'is-active' : ''} onClick={() => onChange(tool.id)}>
          <span>{tool.icon}</span>
          <small>{tool.label}</small>
        </button>
      ))}
    </div>
    <button className="rail-layers" onClick={() => onChange('templates')} title="Ebenen"><Layers3 size={18} /></button>
  </nav>
)

const Section = ({ title, children, compact = false }: { title: string; children: ReactNode; compact?: boolean }) => (
  <section className={`panel-section${compact ? ' panel-section--compact' : ''}`}>
    <h3>{title}</h3>
    {children}
  </section>
)

const FieldLabel = ({ children, value }: { children: ReactNode; value?: ReactNode }) => (
  <div className="field-label"><span>{children}</span>{value && <strong>{value}</strong>}</div>
)

const ColorField = ({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) => (
  <label className="color-field">
    <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    <span style={{ background: value }} />
    <strong>{value.toUpperCase()}</strong>
    <small>{label}</small>
  </label>
)

const TemplatePreview = ({ id }: { id: TemplateId }) => (
  <div className={`template-preview template-preview--${id}`}>
    <span className="mini-title">{id === 'ink' ? 'Build\nvisuals.' : id === 'paper' ? 'Your best\nwork.' : id === 'lime' ? 'Launch\nready.' : 'One\ncanvas.'}</span>
    <span className="mini-phone"><i /></span>
    <span className="mini-orb" />
  </div>
)

const TemplatesPanel = ({ onApplyTemplate }: { onApplyTemplate: (id: TemplateId) => void }) => (
  <>
    <div className="panel-heading">
      <div><span>STARTPUNKT</span><h2>Vorlagen</h2></div>
      <p>Ein Look, den du in Sekunden zu deinem machst.</p>
    </div>
    <div className="template-grid">
      {templateMeta.map((template) => (
        <button className="template-card" key={template.id} onClick={() => onApplyTemplate(template.id)}>
          <TemplatePreview id={template.id} />
          <span><strong>{template.name}</strong><small>{template.eyebrow}</small></span>
          <Plus size={15} />
        </button>
      ))}
    </div>
    <p className="panel-hint">Vorlagen werden auf den ausgewählten Screen angewendet. Dein aktueller Inhalt wird dabei ersetzt.</p>
  </>
)

const TextInspector = ({ element, onUpdate }: { element?: Extract<CanvasElement, { type: 'text' }>; onUpdate: (patch: Partial<Extract<CanvasElement, { type: 'text' }>>) => void }) => {
  if (!element) {
    return <div className="empty-inspector"><Type size={24} /><strong>Text auswählen</strong><p>Klicke im Canvas auf eine Textebene, um Schrift, Farbe und Ausrichtung zu bearbeiten.</p></div>
  }

  const fontCategories = [...new Set(fontOptions.map((font) => font.category))]

  return (
    <>
      <Section title="Inhalt">
        <textarea className="text-editor" value={element.text} onChange={(event) => onUpdate({ text: event.target.value })} rows={4} />
      </Section>
      <Section title="Typografie">
        <FieldLabel>Schriftfamilie</FieldLabel>
        <label className="select-field">
          <select value={element.fontFamily} onChange={(event) => onUpdate({ fontFamily: event.target.value })}>
            {fontCategories.map((category) => (
              <optgroup key={category} label={category}>
                {fontOptions.filter((font) => font.category === category).map((font) => <option key={font.value} value={font.value}>{font.name}</option>)}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
        <div className="two-fields">
          <label className="number-field"><span>Größe</span><input type="number" min="6" max="120" value={element.fontSize} onChange={(event) => onUpdate({ fontSize: Number(event.target.value) })} /><small>px</small></label>
          <label className="number-field"><span>Stärke</span><input type="number" min="100" max="900" step="50" value={element.fontWeight} onChange={(event) => onUpdate({ fontWeight: Number(event.target.value) })} /></label>
        </div>
        <FieldLabel>Ausrichtung</FieldLabel>
        <div className="segmented-control segmented-control--three">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button key={align} className={element.align === align ? 'is-active' : ''} onClick={() => onUpdate({ align })} aria-label={`${align} ausrichten`}>
              {align === 'left' ? <AlignLeft size={16} /> : align === 'center' ? <AlignCenter size={16} /> : <AlignRight size={16} />}
            </button>
          ))}
        </div>
        <FieldLabel>Schriftschnitt</FieldLabel>
        <div className="style-toggle-grid">
          <button className={element.fontWeight >= 700 ? 'is-active' : ''} onClick={() => onUpdate({ fontWeight: element.fontWeight >= 700 ? 500 : 760 })} title="Fett"><Bold size={15} /></button>
          <button className={element.italic ? 'is-active' : ''} onClick={() => onUpdate({ italic: !element.italic })} title="Kursiv"><Italic size={15} /></button>
          <button className={element.underline ? 'is-active' : ''} onClick={() => onUpdate({ underline: !element.underline })} title="Unterstrichen"><Underline size={15} /></button>
          <button className={element.strikethrough ? 'is-active' : ''} onClick={() => onUpdate({ strikethrough: !element.strikethrough })} title="Durchgestrichen"><Strikethrough size={15} /></button>
        </div>
        <FieldLabel>Schreibweise</FieldLabel>
        <div className="choice-row choice-row--three">
          <button className={(element.textTransform ?? 'none') === 'none' ? 'is-active' : ''} onClick={() => onUpdate({ textTransform: 'none' })}>Aa</button>
          <button className={element.textTransform === 'uppercase' ? 'is-active' : ''} onClick={() => onUpdate({ textTransform: 'uppercase' })}>AA</button>
          <button className={element.textTransform === 'lowercase' ? 'is-active' : ''} onClick={() => onUpdate({ textTransform: 'lowercase' })}>aa</button>
        </div>
        <div className="range-stack">
          <FieldLabel value={element.lineHeight.toFixed(2)}>Zeilenhöhe</FieldLabel>
          <input type="range" min="0.7" max="1.8" step="0.02" value={element.lineHeight} onChange={(event) => onUpdate({ lineHeight: Number(event.target.value) })} />
          <FieldLabel value={`${element.letterSpacing.toFixed(1)} px`}>Laufweite</FieldLabel>
          <input type="range" min="-4" max="8" step="0.1" value={element.letterSpacing} onChange={(event) => onUpdate({ letterSpacing: Number(event.target.value) })} />
        </div>
      </Section>
      <Section title="Farbe & Textfläche">
        <ColorField value={element.color} onChange={(color) => onUpdate({ color })} label="Text" />
        <ColorField value={element.backgroundColor ?? '#ffffff'} onChange={(backgroundColor) => onUpdate({ backgroundColor })} label="Hintergrund" />
        <div className="range-stack">
          <FieldLabel value={`${Math.round((element.backgroundOpacity ?? 0) * 100)}%`}>Hintergrund-Deckkraft</FieldLabel>
          <input type="range" min="0" max="1" step="0.01" value={element.backgroundOpacity ?? 0} onChange={(event) => onUpdate({ backgroundOpacity: Number(event.target.value) })} />
          <FieldLabel value={`${element.padding ?? 0} px`}>Innenabstand</FieldLabel>
          <input type="range" min="0" max="24" step="1" value={element.padding ?? 0} onChange={(event) => onUpdate({ padding: Number(event.target.value) })} />
          <FieldLabel value={`${element.borderRadius ?? 0} px`}>Ecken</FieldLabel>
          <input type="range" min="0" max="40" step="1" value={element.borderRadius ?? 0} onChange={(event) => onUpdate({ borderRadius: Number(event.target.value) })} />
        </div>
      </Section>
      <Section title="Kontur & Schatten">
        <ColorField value={element.strokeColor ?? '#111116'} onChange={(strokeColor) => onUpdate({ strokeColor })} label="Kontur" />
        <div className="range-stack">
          <FieldLabel value={`${element.strokeWidth ?? 0} px`}>Konturstärke</FieldLabel>
          <input type="range" min="0" max="3" step="0.25" value={element.strokeWidth ?? 0} onChange={(event) => onUpdate({ strokeWidth: Number(event.target.value) })} />
          <FieldLabel value={`${element.shadow ?? 0}%`}>Textschatten</FieldLabel>
          <input type="range" min="0" max="100" step="1" value={element.shadow ?? 0} onChange={(event) => onUpdate({ shadow: Number(event.target.value) })} />
        </div>
        <ColorField value={element.shadowColor ?? '#000000'} onChange={(shadowColor) => onUpdate({ shadowColor })} label="Schatten" />
      </Section>
    </>
  )
}

const ElementsPanel = ({ element, onAddShape, onUpdate }: {
  element?: ShapeElement
  onAddShape: (shape: ShapeElement['shape']) => void
  onUpdate: (patch: Partial<ShapeElement>) => void
}) => (
  <>
    <div className="panel-heading"><div><span>VEKTOREN</span><h2>Elemente</h2></div><p>Formen, Akzente, Pfeile und Linien für klarere Stories.</p></div>
    <div className="shape-library">
      {(['Basis', 'Akzent', 'Linien'] as const).map((group) => (
        <div className="shape-library-group" key={group}>
          <FieldLabel>{group}</FieldLabel>
          <div className="shape-grid">
            {shapeCatalog.filter((shape) => shape.group === group).map((shape) => {
              const preview: ShapeElement = {
                id: `preview-${shape.id}`,
                type: 'shape',
                x: 0,
                y: 0,
                width: 100,
                rotation: 0,
                opacity: 1,
                shape: shape.id,
                color: '#292923',
                strokeColor: '#292923',
                strokeWidth: ['line', 'arrow', 'wave', 'ring'].includes(shape.id) ? 7 : 0,
                shadow: 0,
              }
              return (
                <button key={shape.id} onClick={() => onAddShape(shape.id)} title={`${shape.label} hinzufügen`}>
                  <span><ShapeGraphic element={preview} /></span>
                  <small>{shape.label}</small>
                  <Plus size={12} />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
    {element ? (
      <Section title="Ausgewähltes Element">
        <ColorField value={element.color} onChange={(color) => onUpdate({ color })} label="Füllung / Linie" />
        <ColorField value={element.strokeColor ?? '#171713'} onChange={(strokeColor) => onUpdate({ strokeColor })} label="Kontur" />
        <div className="range-stack">
          <FieldLabel value={`${element.strokeWidth ?? 0}`}>Konturstärke</FieldLabel>
          <input type="range" min="0" max="12" step="1" value={element.strokeWidth ?? 0} onChange={(event) => onUpdate({ strokeWidth: Number(event.target.value) })} />
          <FieldLabel value={`${element.shadow ?? 0}%`}>Schatten</FieldLabel>
          <input type="range" min="0" max="100" step="1" value={element.shadow ?? 0} onChange={(event) => onUpdate({ shadow: Number(event.target.value) })} />
          <FieldLabel value={`${Math.round(element.opacity * 100)}%`}>Deckkraft</FieldLabel>
          <input type="range" min="0.05" max="1" step="0.01" value={element.opacity} onChange={(event) => onUpdate({ opacity: Number(event.target.value) })} />
        </div>
      </Section>
    ) : <p className="panel-hint">Klicke auf ein Element, um es zum aktiven Screen hinzuzufügen.</p>}
  </>
)

const DevicePanel = ({ element, onAddDevice, onUpdate, onUploadToDevice }: {
  element?: Extract<CanvasElement, { type: 'device' }>
  onAddDevice: (style: Extract<CanvasElement, { type: 'device' }>['deviceStyle']) => void
  onUpdate: (patch: Partial<Extract<CanvasElement, { type: 'device' }>>) => void
  onUploadToDevice: (file: File) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isPhotoMockup = element ? deviceOptions.find((device) => device.id === element.deviceStyle)?.kind === 'photo' : false
  return (
    <>
      <div className="panel-heading"><div><span>GERÄTE</span><h2>Mockups</h2></div><p>Realistische Rahmen mit sauberer Screenshot-Maske.</p></div>
      <div className="device-grid">
        {deviceOptions.map((device) => (
          <button
            key={device.id}
            className={element?.deviceStyle === device.id ? 'is-selected' : ''}
            onClick={() => element
              ? onUpdate(device.id === 'tilted-hand'
                ? { deviceStyle: device.id, x: -7, y: 38, width: 114, rotation: 0 }
                : { deviceStyle: device.id, x: 20, y: 30, width: 62 })
              : onAddDevice(device.id)}
          >
            <span className={`device-swatch device-swatch--${device.id}`}><i /></span>
            <small>{device.label}</small>
            {element?.deviceStyle === device.id && <Check size={13} />}
          </button>
        ))}
      </div>
      {element ? (
        <>
          <Section title="Screenshot">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => event.target.files?.[0] && onUploadToDevice(event.target.files[0])} />
            <button className="upload-drop" onClick={() => inputRef.current?.click()}>
              {element.screenshot ? <img src={element.screenshot} alt="Aktueller Screenshot" /> : <ImagePlus size={20} />}
              <span><strong>{element.screenshot ? 'Screenshot ersetzen' : 'Screenshot einsetzen'}</strong><small>PNG, JPG oder WebP</small></span>
            </button>
          </Section>
          {isPhotoMockup ? (
            <div className="photo-perspective-note">
              <Sparkles size={16} />
              <span><strong>Echte PSD-Perspektive</strong><small>Neigung, Licht, Schatten und Hand stammen direkt aus dem Smart Mockup. Drehen und skalieren kannst du es weiterhin im Canvas.</small></span>
            </div>
          ) : (
            <Section title="Perspektive">
              <div className="range-stack">
                <FieldLabel value={`${element.tiltY}°`}>Seitliche Neigung</FieldLabel>
                <input type="range" min="-18" max="18" value={element.tiltY} onChange={(event) => onUpdate({ tiltY: Number(event.target.value) })} />
                <FieldLabel value={`${element.tiltX}°`}>Vertikale Neigung</FieldLabel>
                <input type="range" min="-12" max="12" value={element.tiltX} onChange={(event) => onUpdate({ tiltX: Number(event.target.value) })} />
                <FieldLabel value={`${element.shadow}%`}>Schatten</FieldLabel>
                <input type="range" min="0" max="100" value={element.shadow} onChange={(event) => onUpdate({ shadow: Number(event.target.value) })} />
              </div>
            </Section>
          )}
        </>
      ) : <p className="panel-hint">Wähle ein Mockup, um es zum aktiven Screen hinzuzufügen.</p>}
    </>
  )
}

const backgroundPatterns: Array<{ id: BackgroundPattern; label: string }> = [
  { id: 'none', label: 'Ohne' },
  { id: 'dots', label: 'Punkte' },
  { id: 'grid', label: 'Raster' },
  { id: 'diagonal', label: 'Diagonal' },
  { id: 'waves', label: 'Wellen' },
]

const BackgroundPanel = ({ background, uploads, onUpdate, onUploadBackground }: {
  background: Background
  uploads: UploadAsset[]
  onUpdate: (patch: Partial<Background>) => void
  onUploadBackground: (file: File) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const pattern = background.pattern ?? 'none'
  const previewStyle = { ...getBackgroundStyle(background), ...getBackgroundPatternStyle(background) }

  return (
    <>
      <div className="panel-heading"><div><span>FLÄCHE</span><h2>Hintergrund</h2></div><p>Farbe, Verläufe, Fotos und grafische Muster für den gesamten Screen.</p></div>
      <div className={`background-preview pattern-surface pattern--${pattern}`} style={previewStyle}><Blend size={20} /></div>
      <Section title="Füllung">
        <div className="choice-row choice-row--four">
          <button className={background.type === 'solid' ? 'is-active' : ''} onClick={() => onUpdate({ type: 'solid' })}>Fläche</button>
          <button className={background.type === 'gradient' && background.gradientKind !== 'radial' ? 'is-active' : ''} onClick={() => onUpdate({ type: 'gradient', gradientKind: 'linear' })}>Linear</button>
          <button className={background.type === 'gradient' && background.gradientKind === 'radial' ? 'is-active' : ''} onClick={() => onUpdate({ type: 'gradient', gradientKind: 'radial' })}>Radial</button>
          <button className={background.type === 'image' ? 'is-active' : ''} onClick={() => onUpdate({ type: 'image' })}>Bild</button>
        </div>
        {background.type !== 'image' && (
          <>
            <ColorField value={background.color1} onChange={(color1) => onUpdate({ color1 })} label={background.type === 'gradient' ? 'Start' : 'Farbe'} />
            {background.type === 'gradient' && (
              <>
                <ColorField value={background.color2} onChange={(color2) => onUpdate({ color2 })} label="Ende" />
                {background.gradientKind !== 'radial' && <div className="range-stack"><FieldLabel value={`${background.angle}°`}>Winkel</FieldLabel><input type="range" min="0" max="360" value={background.angle} onChange={(event) => onUpdate({ angle: Number(event.target.value) })} /></div>}
              </>
            )}
          </>
        )}
        {background.type === 'image' && (
          <div className="background-image-controls">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => event.target.files?.[0] && onUploadBackground(event.target.files[0])} />
            <button className="upload-drop background-upload" onClick={() => inputRef.current?.click()}>
              {background.image ? <img src={background.image} alt="Aktueller Hintergrund" /> : <ImagePlus size={20} />}
              <span><strong>{background.image ? 'Hintergrund ersetzen' : 'Hintergrund hochladen'}</strong><small>PNG, JPG oder WebP</small></span>
            </button>
            {uploads.length > 0 && (
              <div className="background-asset-grid">
                {uploads.slice(0, 8).map((asset) => <button key={asset.id} className={background.image === asset.src ? 'is-selected' : ''} onClick={() => onUpdate({ type: 'image', image: asset.src })}><img src={asset.src} alt={asset.name} /></button>)}
              </div>
            )}
            <FieldLabel>Bildanpassung</FieldLabel>
            <div className="choice-row">
              <button className={(background.imageFit ?? 'cover') === 'cover' ? 'is-active' : ''} onClick={() => onUpdate({ imageFit: 'cover' })}>Füllen</button>
              <button className={background.imageFit === 'contain' ? 'is-active' : ''} onClick={() => onUpdate({ imageFit: 'contain' })}>Einpassen</button>
            </div>
            <FieldLabel>Position</FieldLabel>
            <label className="select-field">
              <select value={background.imagePosition ?? 'center'} onChange={(event) => onUpdate({ imagePosition: event.target.value as Background['imagePosition'] })}>
                <option value="top">Oben</option>
                <option value="center">Mitte</option>
                <option value="bottom">Unten</option>
              </select>
              <ChevronDown size={15} />
            </label>
            <ColorField value={background.overlayColor ?? '#111116'} onChange={(overlayColor) => onUpdate({ overlayColor })} label="Overlay" />
            <div className="range-stack">
              <FieldLabel value={`${Math.round((background.overlayOpacity ?? 0.18) * 100)}%`}>Overlay-Deckkraft</FieldLabel>
              <input type="range" min="0" max="0.9" step="0.01" value={background.overlayOpacity ?? 0.18} onChange={(event) => onUpdate({ overlayOpacity: Number(event.target.value) })} />
            </div>
          </div>
        )}
      </Section>
      <Section title="Paletten" compact>
        <div className="palette-grid palette-grid--wide">
          {[
            ['#252435', '#111116'], ['#f2eee5', '#f2eee5'], ['#d8ff55', '#d8ff55'], ['#ff6b4a', '#ffb171'],
            ['#26615d', '#102d2c'], ['#6e57ff', '#ff87cb'], ['#10203a', '#38bdf8'], ['#f8d66d', '#ef8354'],
            ['#1a1a17', '#1a1a17'], ['#f2a7ba', '#fde7d8'], ['#5433ff', '#20bdff'], ['#273c75', '#44bd32'],
          ].map(([a, b]) => <button key={`${a}${b}`} style={{ background: a === b ? a : `linear-gradient(135deg, ${a}, ${b})` }} onClick={() => onUpdate({ type: a === b ? 'solid' : 'gradient', gradientKind: 'linear', color1: a, color2: b })} />)}
        </div>
      </Section>
      <Section title="Muster" compact>
        <div className="pattern-grid">
          {backgroundPatterns.map((item) => (
            <button key={item.id} className={pattern === item.id ? 'is-active' : ''} onClick={() => onUpdate({ pattern: item.id })}>
              <span className={`pattern-swatch pattern-surface pattern--${item.id}`} style={getBackgroundPatternStyle({ ...background, patternColor: '#252521', patternOpacity: 0.42 })} />
              <small>{item.label}</small>
            </button>
          ))}
        </div>
        {pattern !== 'none' && (
          <>
            <ColorField value={background.patternColor ?? '#ffffff'} onChange={(patternColor) => onUpdate({ patternColor })} label="Muster" />
            <div className="range-stack">
              <FieldLabel value={`${Math.round((background.patternOpacity ?? 0.12) * 100)}%`}>Deckkraft</FieldLabel>
              <input type="range" min="0.02" max="0.8" step="0.01" value={background.patternOpacity ?? 0.12} onChange={(event) => onUpdate({ patternOpacity: Number(event.target.value) })} />
              <FieldLabel value={`${background.patternScale ?? 28} px`}>Skalierung</FieldLabel>
              <input type="range" min="10" max="80" step="1" value={background.patternScale ?? 28} onChange={(event) => onUpdate({ patternScale: Number(event.target.value) })} />
            </div>
          </>
        )}
      </Section>
    </>
  )
}

const UploadsPanel = ({ uploads, element, onUpload, onAddImage, onSetDeviceImage, onUpdate }: {
  uploads: UploadAsset[]
  element?: Extract<CanvasElement, { type: 'image' }>
  onUpload: (files: FileList) => void
  onAddImage: (asset: UploadAsset) => void
  onSetDeviceImage: (asset: UploadAsset) => void
  onUpdate: (patch: Partial<Extract<CanvasElement, { type: 'image' }>>) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => event.target.files && onUpload(event.target.files)
  return (
    <>
      <div className="panel-heading"><div><span>MEDIEN</span><h2>Uploads</h2></div><p>App-Screenshots und Motive bleiben lokal in deinem Browser.</p></div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleFiles} />
      <button className="large-upload" onClick={() => inputRef.current?.click()}><span><Upload size={20} /></span><strong>Dateien hochladen</strong><small>PNG, JPG oder WebP · mehrere möglich</small></button>
      {element && (
        <Section title="Ausgewähltes Bild">
          <div className="range-stack">
            <FieldLabel value={`${element.borderRadius}%`}>Ecken</FieldLabel>
            <input type="range" min="0" max="50" step="1" value={element.borderRadius} onChange={(event) => onUpdate({ borderRadius: Number(event.target.value) })} />
            <FieldLabel value={`${element.shadow ?? 32}%`}>Schatten</FieldLabel>
            <input type="range" min="0" max="100" step="1" value={element.shadow ?? 32} onChange={(event) => onUpdate({ shadow: Number(event.target.value) })} />
            <FieldLabel value={`${Math.round(element.opacity * 100)}%`}>Deckkraft</FieldLabel>
            <input type="range" min="0.05" max="1" step="0.01" value={element.opacity} onChange={(event) => onUpdate({ opacity: Number(event.target.value) })} />
          </div>
        </Section>
      )}
      {uploads.length ? (
        <div className="upload-list">
          {uploads.map((asset) => (
            <div className="upload-asset" key={asset.id}>
              <img src={asset.src} alt={asset.name} />
              <div><strong>{asset.name}</strong><span><button onClick={() => onSetDeviceImage(asset)}>In Gerät</button><button onClick={() => onAddImage(asset)}>Frei</button></span></div>
            </div>
          ))}
        </div>
      ) : <div className="empty-uploads"><ImagePlus size={24} /><span>Noch keine Dateien</span></div>}
    </>
  )
}

type PropertiesPanelProps = {
  activeTool: ToolId
  activeSlide: Slide
  selectedElement?: CanvasElement
  uploads: UploadAsset[]
  onApplyTemplate: (id: TemplateId) => void
  onAddText: (preset: TextPreset) => void
  onAddDevice: (style: Extract<CanvasElement, { type: 'device' }>['deviceStyle']) => void
  onAddShape: (shape: ShapeElement['shape']) => void
  onUpdateSelected: (patch: Partial<CanvasElement>) => void
  onUpdateBackground: (patch: Partial<Background>) => void
  onUploadFiles: (files: FileList) => void
  onUploadToDevice: (file: File) => void
  onUploadBackground: (file: File) => void
  onAddImage: (asset: UploadAsset) => void
  onSetDeviceImage: (asset: UploadAsset) => void
}

export const PropertiesPanel = ({ activeTool, activeSlide, selectedElement, uploads, onApplyTemplate, onAddText, onAddDevice, onAddShape, onUpdateSelected, onUpdateBackground, onUploadFiles, onUploadToDevice, onUploadBackground, onAddImage, onSetDeviceImage }: PropertiesPanelProps) => (
  <aside className="properties-panel">
    <div className="panel-scroll">
      {activeTool === 'templates' && <TemplatesPanel onApplyTemplate={onApplyTemplate} />}
      {activeTool === 'elements' && <ElementsPanel element={selectedElement?.type === 'shape' ? selectedElement : undefined} onAddShape={onAddShape} onUpdate={(patch) => onUpdateSelected(patch as Partial<CanvasElement>)} />}
      {activeTool === 'text' && (
        <>
          <div className="panel-heading"><div><span>TYPE</span><h2>Text</h2></div><p>Ausdrucksstarke Hierarchien, Labels und Zitate für App-Store-Screens.</p></div>
          <div className="text-presets">
            <button onClick={() => onAddText('title')}><strong>Aa</strong><span><b>Headline</b><small>Groß & aufmerksam</small></span><Plus size={15} /></button>
            <button onClick={() => onAddText('subtitle')}><strong className="preset-subtitle">Aa</strong><span><b>Subheadline</b><small>Klarer zweiter Takt</small></span><Plus size={15} /></button>
            <button onClick={() => onAddText('body')}><strong className="preset-body">Ag</strong><span><b>Fließtext</b><small>Erklärung & Kontext</small></span><Plus size={15} /></button>
            <button onClick={() => onAddText('label')}><strong className="preset-label">AA</strong><span><b>Label</b><small>Kleine Akzente</small></span><Plus size={15} /></button>
            <button onClick={() => onAddText('quote')}><strong className="preset-quote">“</strong><span><b>Zitat</b><small>Editorial & menschlich</small></span><Plus size={15} /></button>
            <button onClick={() => onAddText('stat')}><strong className="preset-stat">98</strong><span><b>Kennzahl</b><small>Zahl als Blickfang</small></span><Plus size={15} /></button>
          </div>
          <TextInspector element={selectedElement?.type === 'text' ? selectedElement : undefined} onUpdate={(patch) => onUpdateSelected(patch as Partial<CanvasElement>)} />
        </>
      )}
      {activeTool === 'device' && <DevicePanel element={selectedElement?.type === 'device' ? selectedElement : undefined} onAddDevice={onAddDevice} onUpdate={(patch) => onUpdateSelected(patch as Partial<CanvasElement>)} onUploadToDevice={onUploadToDevice} />}
      {activeTool === 'background' && <BackgroundPanel background={activeSlide.background} uploads={uploads} onUpdate={onUpdateBackground} onUploadBackground={onUploadBackground} />}
      {activeTool === 'uploads' && <UploadsPanel uploads={uploads} element={selectedElement?.type === 'image' ? selectedElement : undefined} onUpload={onUploadFiles} onAddImage={onAddImage} onSetDeviceImage={onSetDeviceImage} onUpdate={(patch) => onUpdateSelected(patch as Partial<CanvasElement>)} />}
    </div>
    <div className="panel-footer"><span><i /> Auto-save</span><small>Alles bleibt lokal</small></div>
  </aside>
)
