import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { EditorCanvas } from './EditorCanvas'
import type { Slide } from '../types'
import type { ComponentProps } from 'react'

vi.mock('./ui/button', () => ({
  Button: ({ variant, size, ...props }: ComponentProps<'button'> & {
    variant?: string
    size?: string
  }) => <button data-variant={variant} data-size={size} {...props} />,
}))

const slides: Slide[] = [
  {
    id: 'slide-one',
    name: 'Hook',
    background: { type: 'solid', color1: '#ffffff', color2: '#ffffff', angle: 0 },
    elements: [],
  },
  {
    id: 'slide-two',
    name: 'Story',
    background: { type: 'solid', color1: '#ffffff', color2: '#ffffff', angle: 0 },
    elements: [],
  },
]

describe('EditorCanvas screen actions', () => {
  it('groups AI editing with the other contextual screen actions', () => {
    const markup = renderToStaticMarkup(
      <EditorCanvas
        slides={slides}
        activeSlideId="slide-one"
        selectedElementIds={[]}
        exporting={false}
        zoom={1}
        onSetActiveSlide={() => undefined}
        onSelectElement={() => undefined}
        onUpdateElements={() => undefined}
        onCommitText={() => undefined}
        onCheckpoint={() => undefined}
        onAddSlide={() => undefined}
        onDuplicateSlide={() => undefined}
        onDeleteSlide={() => undefined}
        onMoveSlide={() => undefined}
        onEditSlideWithAi={() => undefined}
      />,
    )
    const root = document.createElement('div')
    root.innerHTML = markup
    const actionGroups = root.querySelectorAll('.artboard-screen-actions')

    expect(actionGroups.length).toBe(2)
    for (const group of actionGroups) {
      expect(group.querySelectorAll('button').length).toBe(5)
    }

    const aiAction = root.querySelector('[aria-label="Edit Hook with AI"]')
    expect(aiAction?.parentElement).toBe(actionGroups.item(0))
  })
})
