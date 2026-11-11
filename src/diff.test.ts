import { describe, expect, it } from 'vitest'
import { comparePixels } from './diff'

const data = (values: number[]) => new ImageData(new Uint8ClampedArray(values), values.length / 4, 1)

describe('comparePixels', () => {
  it('returns zero differences for equal images', () => {
    const result = comparePixels(data([20, 30, 40, 255, 50, 60, 70, 255]), data([20, 30, 40, 255, 50, 60, 70, 255]))
    expect(result.metrics.changedPixels).toBe(0)
    expect(result.metrics.percent).toBe(0)
    expect(result.metrics.bounds).toBeNull()
  })
  it('counts changed pixels and computes the changed bounds', () => {
    const result = comparePixels(data([0, 0, 0, 255, 0, 0, 0, 255]), data([0, 0, 0, 255, 255, 0, 0, 255]))
    expect(result.metrics.changedPixels).toBe(1)
    expect(result.metrics.percent).toBe(50)
    expect(result.metrics.bounds).toEqual({ x: 1, y: 0, width: 1, height: 1 })
  })
  it('supports differing image dimensions', () => {
    const result = comparePixels(new ImageData(1, 1), new ImageData(2, 1))
    expect(result.image.width).toBe(2)
    expect(result.metrics.totalPixels).toBe(2)
  })
  it('respects sensitivity threshold', () => {
    const result = comparePixels(data([100, 100, 100, 255]), data([110, 100, 100, 255]), { threshold: 12, amplification: 3, align: 'top-left' })
    expect(result.metrics.changedPixels).toBe(0)
  })
})
