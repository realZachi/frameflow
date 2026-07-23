import type { Slide } from '../types'

export type SlideRemoval = {
  slides: Slide[]
  activeSlideId: string | null
}

export const removeSlide = (
  slides: Slide[],
  slideId: string,
  activeSlideId: string,
): SlideRemoval | null => {
  const index = slides.findIndex((slide) => slide.id === slideId)
  if (index === -1) return null

  const fallback = slides[index - 1] ?? slides[index + 1] ?? null
  return {
    slides: slides.filter((slide) => slide.id !== slideId),
    activeSlideId: activeSlideId === slideId ? fallback?.id ?? null : activeSlideId,
  }
}
