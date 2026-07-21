type AiCursorActivity = { tool: string; x?: number; y?: number; seq: number }

type Props = {
  activity: AiCursorActivity
}

const LABELS: Record<string, string> = {
  add_text: 'Text',
  add_device: 'Gerät',
  add_shape: 'Form',
  add_image: 'Bild',
  add_slide: 'Neuer Screen',
  rename_slide: 'Benennen',
  set_slide_background: 'Hintergrund',
  set_device_screenshot: 'Screenshot',
  update_element: 'Feinschliff',
  delete_element: 'Aufräumen',
  delete_slide: 'Aufräumen',
  inspect_slide: 'Layout prüfen',
  render_slide_preview: 'Vorschau prüfen',
}

export const AiCursorOverlay = ({ activity }: Props) => {
  const label = LABELS[activity.tool] ?? 'arbeitet'
  return (
    <div className="ai-cursor-layer" data-ai-overlay="true" aria-hidden="true">
      <div className="ai-cursor" style={{ left: `${activity.x ?? 50}%`, top: `${activity.y ?? 30}%` }}>
        <span className="ai-cursor-ripple" key={activity.seq} />
        <svg width="15" height="18" viewBox="0 0 15 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M1 1L1 14.5L4.6 11.3L6.9 16.6L9.2 15.6L6.9 10.3L11.6 10.1L1 1Z"
            fill="#7c5cff"
            stroke="white"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
        <span className="ai-cursor-label">KI · {label}</span>
      </div>
    </div>
  )
}
