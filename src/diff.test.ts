import { describe, expect, it } from 'vitest'
import { comparePixels } from './diff'

class TestImageData {
  data: Uint8ClampedArray
  width: number
  height: number
  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth
      this.height = widthOrHeight
      this.data = new Uint8ClampedArray(this.width * this.height * 4)
    } else {
      this.data = dataOrWidth
      this.width = widthOrHeight
      this.height = height ?? 1
    }
  }
}
const data = (values: number[]) => new TestImageData(new Uint8ClampedArray(values), values.length / 4)

describe('comparePixels', () => {
  it('returns zero differences for equal images', () => {
    const result = comparePixels(data([20, 30, 40, 255, 50, 60, 70, 255]) as unknown as ImageData, data([20, 30, 40, 255, 50, 60, 70, 255]) as unknown as ImageData)
    expect(result.metrics.changedPixels).toBe(0)
    expect(result.metrics.percent).toBe(0)
    expect(result.metrics.bounds).toBeNull()
  })
  it('counts changed pixels and computes the changed bounds', () => {
    const result = comparePixels(data([0, 0, 0, 255, 0, 0, 0, 255]) as unknown as ImageData, data([0, 0, 0, 255, 255, 0, 0, 255]) as unknown as ImageData)
    expect(result.metrics.changedPixels).toBe(1)
    expect(result.metrics.percent).toBe(50)
    expect(result.metrics.bounds).toEqual({ x: 1, y: 0, width: 1, height: 1 })
  })
  it('supports differing image dimensions', () => {
    const result = comparePixels(new TestImageData(1, 1) as unknown as ImageData, new TestImageData(2, 1) as unknown as ImageData)
    expect(result.image.width).toBe(2)
    expect(result.metrics.totalPixels).toBe(2)
  })
  it('respects sensitivity threshold', () => {
    const result = comparePixels(data([100, 100, 100, 255]) as unknown as ImageData, data([110, 100, 100, 255]) as unknown as ImageData, { threshold: 12, amplification: 3, align: 'top-left' })
    expect(result.metrics.changedPixels).toBe(0)
  })
})
