import { useRef, type ChangeEvent, type ReactNode } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Blend,
  Check,
  ChevronDown,
  ImagePlus,
  Layers3,
  MonitorSmartphone,
  Palette,
  Plus,
  Sparkles,
  Type,
  Upload,
} from 'lucide-react'
import { fontOptions, templateMeta } from '../data'
import type { Background, CanvasElement, Slide, TemplateId, ToolId, UploadAsset } from '../types'
import { deviceOptions } from '../mockups/catalog'

const tools: Array<{ id: ToolId; label: string; icon: ReactNode }> = [
  { id: 'templates', label: 'Vorlagen', icon: <Sparkles size={19} /> },
  { id: 'device', label: 'Mockups', icon: <MonitorSmartphone size={19} /> },
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

  return (
    <>
      <Section title="Inhalt">
        <textarea className="text-editor" value={element.text} onChange={(event) => onUpdate({ text: event.target.value })} rows={4} />
      </Section>
      <Section title="Typografie">
        <FieldLabel>Schriftfamilie</FieldLabel>
        <label className="select-field">
          <select value={element.fontFamily} onChange={(event) => onUpdate({ fontFamily: event.target.value })}>
            {fontOptions.map((font) => <option key={font.value} value={font.value}>{font.name}</option>)}
          </select>
          <ChevronDown size={15} />
        </label>
        <div className="two-fields">
          <label className="number-field"><span>Größe</span><input type="number" min="6" max="120" value={element.fontSize} onChange={(event) => onUpdate({ fontSize: Number(event.target.value) })} /><small>px</small></label>
          <label className="number-field"><span>Stärke</span><input type="number" min="100" max="900" step="50" value={element.fontWeight} onChange={(event) => onUpdate({ fontWeight: Number(event.target.value) })} /></label>
        </div>
        <div className="segmented-control">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button key={align} className={element.align === align ? 'is-active' : ''} onClick={() => onUpdate({ align })} aria-label={`${align} ausrichten`}>
              {align === 'left' ? <AlignLeft size={16} /> : align === 'center' ? <AlignCenter size={16} /> : <AlignRight size={16} />}
            </button>
          ))}
          <button className={element.italic ? 'is-active text-style-button' : 'text-style-button'} onClick={() => onUpdate({ italic: !element.italic })}><i>I</i></button>
        </div>
        <div className="range-stack">
          <FieldLabel value={element.lineHeight.toFixed(2)}>Zeilenhöhe</FieldLabel>
          <input type="range" min="0.7" max="1.8" step="0.02" value={element.lineHeight} onChange={(event) => onUpdate({ lineHeight: Number(event.target.value) })} />
          <FieldLabel value={`${element.letterSpacing.toFixed(1)} px`}>Laufweite</FieldLabel>
          <input type="range" min="-4" max="8" step="0.1" value={element.letterSpacing} onChange={(event) => onUpdate({ letterSpacing: Number(event.target.value) })} />
        </div>
      </Section>
      <Section title="Farbe"><ColorField value={element.color} onChange={(color) => onUpdate({ color })} label="Text" /></Section>
    </>
  )
}

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

const BackgroundPanel = ({ background, onUpdate }: { background: Background; onUpdate: (patch: Partial<Background>) => void }) => (
  <>
    <div className="panel-heading"><div><span>FLÄCHE</span><h2>Hintergrund</h2></div><p>Setze die Stimmung für deinen gesamten Screen.</p></div>
    <div className="background-preview" style={{ background: background.type === 'gradient' ? `linear-gradient(${background.angle}deg, ${background.color1}, ${background.color2})` : background.color1 }}><Blend size={20} /></div>
    <Section title="Füllung">
      <div className="choice-row">
        <button className={background.type === 'solid' ? 'is-active' : ''} onClick={() => onUpdate({ type: 'solid' })}>Fläche</button>
        <button className={background.type === 'gradient' ? 'is-active' : ''} onClick={() => onUpdate({ type: 'gradient' })}>Verlauf</button>
      </div>
      <ColorField value={background.color1} onChange={(color1) => onUpdate({ color1 })} label="Start" />
      {background.type === 'gradient' && (
        <>
          <ColorField value={background.color2} onChange={(color2) => onUpdate({ color2 })} label="Ende" />
          <div className="range-stack"><FieldLabel value={`${background.angle}°`}>Winkel</FieldLabel><input type="range" min="0" max="360" value={background.angle} onChange={(event) => onUpdate({ angle: Number(event.target.value) })} /></div>
        </>
      )}
    </Section>
    <Section title="Paletten" compact>
      <div className="palette-grid">
        {[
          ['#252435', '#111116'], ['#f2eee5', '#f2eee5'], ['#d8ff55', '#d8ff55'], ['#ff6b4a', '#ffb171'], ['#26615d', '#102d2c'], ['#6e57ff', '#ff87cb'],
        ].map(([a, b]) => <button key={`${a}${b}`} style={{ background: a === b ? a : `linear-gradient(135deg, ${a}, ${b})` }} onClick={() => onUpdate({ type: a === b ? 'solid' : 'gradient', color1: a, color2: b })} />)}
      </div>
    </Section>
  </>
)

const UploadsPanel = ({ uploads, onUpload, onAddImage, onSetDeviceImage }: { uploads: UploadAsset[]; onUpload: (files: FileList) => void; onAddImage: (asset: UploadAsset) => void; onSetDeviceImage: (asset: UploadAsset) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => event.target.files && onUpload(event.target.files)
  return (
    <>
      <div className="panel-heading"><div><span>MEDIEN</span><h2>Uploads</h2></div><p>App-Screenshots und Motive bleiben lokal in deinem Browser.</p></div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleFiles} />
      <button className="large-upload" onClick={() => inputRef.current?.click()}><span><Upload size={20} /></span><strong>Dateien hochladen</strong><small>PNG, JPG oder WebP · mehrere möglich</small></button>
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
  onAddText: (preset: 'title' | 'body' | 'label') => void
  onAddDevice: (style: Extract<CanvasElement, { type: 'device' }>['deviceStyle']) => void
  onUpdateSelected: (patch: Partial<CanvasElement>) => void
  onUpdateBackground: (patch: Partial<Background>) => void
  onUploadFiles: (files: FileList) => void
  onUploadToDevice: (file: File) => void
  onAddImage: (asset: UploadAsset) => void
  onSetDeviceImage: (asset: UploadAsset) => void
}

export const PropertiesPanel = ({ activeTool, activeSlide, selectedElement, uploads, onApplyTemplate, onAddText, onAddDevice, onUpdateSelected, onUpdateBackground, onUploadFiles, onUploadToDevice, onAddImage, onSetDeviceImage }: PropertiesPanelProps) => (
  <aside className="properties-panel">
    <div className="panel-scroll">
      {activeTool === 'templates' && <TemplatesPanel onApplyTemplate={onApplyTemplate} />}
      {activeTool === 'text' && (
        <>
          <div className="panel-heading"><div><span>TYPE</span><h2>Text</h2></div><p>Klare Hierarchien für kleine App-Store-Flächen.</p></div>
          <div className="text-presets">
            <button onClick={() => onAddText('title')}><strong>Aa</strong><span><b>Headline</b><small>Groß & aufmerksam</small></span><Plus size={15} /></button>
            <button onClick={() => onAddText('body')}><strong className="preset-body">Ag</strong><span><b>Fließtext</b><small>Erklärung & Kontext</small></span><Plus size={15} /></button>
            <button onClick={() => onAddText('label')}><strong className="preset-label">AA</strong><span><b>Label</b><small>Kleine Akzente</small></span><Plus size={15} /></button>
          </div>
          <TextInspector element={selectedElement?.type === 'text' ? selectedElement : undefined} onUpdate={(patch) => onUpdateSelected(patch as Partial<CanvasElement>)} />
        </>
      )}
      {activeTool === 'device' && <DevicePanel element={selectedElement?.type === 'device' ? selectedElement : undefined} onAddDevice={onAddDevice} onUpdate={(patch) => onUpdateSelected(patch as Partial<CanvasElement>)} onUploadToDevice={onUploadToDevice} />}
      {activeTool === 'background' && <BackgroundPanel background={activeSlide.background} onUpdate={onUpdateBackground} />}
      {activeTool === 'uploads' && <UploadsPanel uploads={uploads} onUpload={onUploadFiles} onAddImage={onAddImage} onSetDeviceImage={onSetDeviceImage} />}
    </div>
    <div className="panel-footer"><span><i /> Auto-save</span><small>Alles bleibt lokal</small></div>
  </aside>
)
