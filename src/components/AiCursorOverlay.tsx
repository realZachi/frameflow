type AiCursorActivity = { tool: string; x?: number; y?: number; seq: number }

type Props = {
  activity: AiCursorActivity
}

const LABELS: Record<string, string> = {
  add_text: 'Text',
  add_device: 'Device',
  add_shape: 'Shape',
  add_image: 'Image',
  add_slide: 'New screen',
  rename_slide: 'Rename',
  set_slide_background: 'Background',
  set_device_screenshot: 'Screenshot',
  update_element: 'Refining',
  delete_element: 'Cleaning up',
  delete_slide: 'Cleaning up',
  inspect_slide: 'Checking layout',
  render_slide_preview: 'Checking preview',
}

export const AiCursorOverlay = ({ activity }: Props) => {
  const label = LABELS[activity.tool] ?? 'Working'
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
        <span className="ai-cursor-label">AI · {label}</span>
      </div>
    </div>
  )
}
