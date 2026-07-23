import { describe, expect, it } from 'vitest'
import { removeSlide } from './slide-operations'
import type { Slide } from '../types'

const slide = (id: string): Slide => ({
  id,
  name: id,
  background: {
    type: 'solid',
    color1: '#ffffff',
    color2: '#ffffff',
    angle: 0,
  },
  elements: [],
})

describe('slide operations', () => {
  it('removes the only slide and leaves the project without an active slide', () => {
    const slides = [slide('only')]

    expect(removeSlide(slides, 'only', 'only')).toEqual({
      slides: [],
      activeSlideId: null,
    })
    expect(slides).toHaveLength(1)
  })

  it('selects the previous slide after removing the active slide', () => {
    const slides = [slide('first'), slide('second'), slide('third')]

    expect(removeSlide(slides, 'second', 'second')).toEqual({
      slides: [slides[0], slides[2]],
      activeSlideId: 'first',
    })
  })

  it('selects the next slide when removing the first active slide', () => {
    const slides = [slide('first'), slide('second')]

    expect(removeSlide(slides, 'first', 'first')?.activeSlideId).toBe('second')
  })

  it('preserves the active slide when removing a different slide', () => {
    const slides = [slide('first'), slide('second')]

    expect(removeSlide(slides, 'second', 'first')?.activeSlideId).toBe('first')
  })

  it('does nothing when the requested slide does not exist', () => {
    expect(removeSlide([slide('first')], 'missing', 'first')).toBeNull()
  })
})
