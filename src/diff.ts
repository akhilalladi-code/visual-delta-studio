export type PixelBuffer = { data: Uint8ClampedArray; width: number; height: number }
export type DiffSettings = { threshold: number; amplification: number; align: 'center' | 'top-left' }
export type DiffMetrics = { changedPixels: number; totalPixels: number; percent: number; bounds: { x: number; y: number; width: number; height: number } | null }

export function comparePixels(
  a: PixelBuffer, b: PixelBuffer, settings: DiffSettings = { threshold: 18, amplification: 3, align: 'top-left' },
): { image: PixelBuffer; metrics: DiffMetrics } {
  const width = Math.max(a.width, b.width)
  const height = Math.max(a.height, b.height)
  const out: PixelBuffer = { data: new Uint8ClampedArray(width * height * 4), width, height }
  const ax = settings.align === 'center' ? Math.floor((width - a.width) / 2) : 0
  const ay = settings.align === 'center' ? Math.floor((height - a.height) / 2) : 0
  const bx = settings.align === 'center' ? Math.floor((width - b.width) / 2) : 0
  const by = settings.align === 'center' ? Math.floor((height - b.height) / 2) : 0
  let changedPixels = 0
  let minX = width, minY = height, maxX = -1, maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const oi = (y * width + x) * 4
      const ai = ((y - ay) * a.width + x - ax) * 4
      const bi = ((y - by) * b.width + x - bx) * 4
      const hasA = x >= ax && y >= ay && x < ax + a.width && y < ay + a.height
      const hasB = x >= bx && y >= by && x < bx + b.width && y < by + b.height
      const ar = hasA ? a.data[ai] : 0, ag = hasA ? a.data[ai + 1] : 0, ab = hasA ? a.data[ai + 2] : 0, aa = hasA ? a.data[ai + 3] : 0
      const br = hasB ? b.data[bi] : 0, bg = hasB ? b.data[bi + 1] : 0, bb = hasB ? b.data[bi + 2] : 0, ba = hasB ? b.data[bi + 3] : 0
      const delta = Math.max(Math.abs(ar - br), Math.abs(ag - bg), Math.abs(ab - bb), Math.abs(aa - ba))
      if (delta > settings.threshold) {
        changedPixels++
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
        out.data[oi] = 255
        out.data[oi + 1] = Math.max(24, 255 - Math.min(255, delta * settings.amplification))
        out.data[oi + 2] = 36
        out.data[oi + 3] = 230
      } else {
        const luminance = (ar + ag + ab) / 3
        out.data[oi] = luminance * 0.12
        out.data[oi + 1] = luminance * 0.12
        out.data[oi + 2] = luminance * 0.12
        out.data[oi + 3] = 255
      }
    }
  }
  const totalPixels = width * height
  return { image: out, metrics: { changedPixels, totalPixels, percent: totalPixels ? changedPixels / totalPixels * 100 : 0, bounds: maxX >= 0 ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null } }
}
