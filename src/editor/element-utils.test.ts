import { describe, expect, it } from 'vitest'
import { freshElementIds } from './element-utils'
import type { ShapeElement } from '../types'

describe('freshElementIds', () => {
  it('re-identifies copied elements without changing their content', () => {
    const element: ShapeElement = {
      id: 'shape-original',
      type: 'shape',
      x: 1,
      y: 2,
      width: 3,
      rotation: 0,
      opacity: 1,
      shape: 'circle',
      color: '#ffffff',
    }

    const [copy] = freshElementIds([element])
    expect(copy).toBeDefined()
    if (!copy) throw new Error('Expected a copied element')
    expect({ ...copy, id: element.id }).toEqual(element)
    expect(copy.id).toMatch(/^shape-/)
    expect(copy.id).not.toBe(element.id)
  })
})
