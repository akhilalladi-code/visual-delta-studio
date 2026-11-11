import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowDownToLine, ArrowLeftRight, Check, ChevronDown, CircleHelp, FileImage, Fingerprint, ImagePlus, Layers2, LockKeyhole, Maximize2, MousePointer2, PanelTop, Plus, ScanEye, Settings2, ShieldCheck, Sparkles, Upload, X } from 'lucide-react'
import { comparePixels, type DiffMetrics } from './diff'

type Mode = 'split' | 'overlay' | 'wipe' | 'diff'
type Loaded = { name: string; url: string; width: number; height: number; image: HTMLImageElement }
const modes: { id: Mode; label: string }[] = [
  { id: 'split', label: 'Side by side' }, { id: 'overlay', label: 'Overlay' }, { id: 'wipe', label: 'Wipe' }, { id: 'diff', label: 'Difference' },
]

function App() {
  const [before, setBefore] = useState<Loaded | null>(null)
  const [after, setAfter] = useState<Loaded | null>(null)
  const [mode, setMode] = useState<Mode>('diff')
  const [threshold, setThreshold] = useState(18)
  const [amplification, setAmplification] = useState(3)
  const [opacity, setOpacity] = useState(50)
  const [align, setAlign] = useState<'top-left' | 'center'>('top-left')
  const [metrics, setMetrics] = useState<DiffMetrics | null>(null)
  const [diffUrl, setDiffUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(true)
  const [wipe, setWipe] = useState(50)
  const inputA = useRef<HTMLInputElement>(null)
  const inputB = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wipeRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (file: File, side: 'before' | 'after') => {
    if (!file.type.startsWith('image/')) { setError('Choose a valid image file.'); return }
    if (file.size > 30 * 1024 * 1024) { setError('Images must be smaller than 30 MB.'); return }
    setError('')
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const item = { name: file.name, url, width: image.naturalWidth, height: image.naturalHeight, image }
      ;(side === 'before' ? setBefore : setAfter)(item)
    }
    image.onerror = () => { URL.revokeObjectURL(url); setError('This image could not be decoded. Try a PNG, JPEG, or WebP file.') }
    image.src = url
  }, [])

  useEffect(() => () => { if (before) URL.revokeObjectURL(before.url); if (after) URL.revokeObjectURL(after.url) }, [before, after])

  useEffect(() => {
    if (!before || !after || !canvasRef.current) { setMetrics(null); setDiffUrl(''); return }
    setBusy(true)
    const run = window.setTimeout(() => {
      const width = Math.max(before.width, after.width), height = Math.max(before.height, after.height)
      const a = document.createElement('canvas'), b = document.createElement('canvas')
      a.width = b.width = width; a.height = b.height = height
      const ac = a.getContext('2d', { willReadFrequently: true }), bc = b.getContext('2d', { willReadFrequently: true })
      if (!ac || !bc) { setError('Your browser could not create a comparison canvas.'); setBusy(false); return }
      const ax = align === 'center' ? Math.floor((width - before.width) / 2) : 0
      const ay = align === 'center' ? Math.floor((height - before.height) / 2) : 0
      const bx = align === 'center' ? Math.floor((width - after.width) / 2) : 0
      const by = align === 'center' ? Math.floor((height - after.height) / 2) : 0
      ac.drawImage(before.image, ax, ay); bc.drawImage(after.image, bx, by)
      const result = comparePixels(ac.getImageData(0, 0, width, height), bc.getImageData(0, 0, width, height), { threshold, amplification, align })
      const canvas = canvasRef.current!
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')?.putImageData(result.image, 0, 0)
      setMetrics(result.metrics)
      setDiffUrl(canvas.toDataURL('image/png'))
      setBusy(false)
    }, 60)
    return () => window.clearTimeout(run)
  }, [before, after, threshold, amplification, align])

  const percent = useMemo(() => metrics ? metrics.percent.toFixed(2) : '0.00', [metrics])
  const download = (url: string, filename: string) => {
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  }
  const exportReport = () => {
    if (!before || !after || !metrics || !diffUrl) return
    const safe = (value: string) => value.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
    const report = `<!doctype html><html><head><meta charset="utf-8"><title>VisualDelta report</title><style>body{font:16px system-ui;background:#101113;color:#eee;max-width:1000px;margin:40px auto;padding:24px}img{max-width:100%;border:1px solid #333;border-radius:12px}.stats{display:flex;gap:28px;flex-wrap:wrap}.stats b{display:block;font-size:28px}section{margin:28px 0}</style></head><body><h1>VisualDelta comparison report</h1><p>Generated locally · ${new Date().toLocaleString()}</p><div class="stats"><div><b>${metrics.changedPixels.toLocaleString()}</b>Changed pixels</div><div><b>${percent}%</b>Difference</div><div><b>${metrics.totalPixels.toLocaleString()}</b>Total pixels</div></div><section><h2>Inputs</h2><p>Before: ${safe(before.name)} (${before.width} × ${before.height})</p><p>After: ${safe(after.name)} (${after.width} × ${after.height})</p></section><section><h2>Difference map</h2><img src="${diffUrl}" alt="Difference heatmap"></section><section><h2>Settings</h2><p>Threshold: ${threshold} · Amplification: ${amplification} · Alignment: ${align}</p></section></body></html>`
    download(URL.createObjectURL(new Blob([report], { type: 'text/html' })), 'visual-delta-report.html')
  }
  const acceptDrop = (event: React.DragEvent, side?: 'before' | 'after') => {
    event.preventDefault(); setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) load(file, side ?? (!before ? 'before' : 'after'))
  }
  const uploadCard = (side: 'before' | 'after') => {
    const item = side === 'before' ? before : after
    return <button className={`upload-card ${item ? 'has-image' : ''}`} onClick={() => (side === 'before' ? inputA : inputB).current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => acceptDrop(e, side)} aria-label={`Upload ${side} image`}>
      {item ? <><img src={item.url} alt={`${side} preview`} /><span className="file-name">{item.name}</span><span className="dimensions">{item.width} × {item.height}</span></> : <><span className="upload-icon"><ImagePlus size={20}/></span><strong>{side === 'before' ? 'Original image' : 'Updated image'}</strong><span className="muted">Drop an image here or browse files</span><span className="file-types">PNG · JPG · WEBP · UP TO 30 MB</span></>}
    </button>
  }
  const moveWipe = (event: React.PointerEvent) => {
    if (!wipeRef.current) return
    const rect = wipeRef.current.getBoundingClientRect()
    setWipe(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)))
  }
  const reset = () => { setBefore(null); setAfter(null); setError(''); setThreshold(18); setAmplification(3); setMode('diff') }

  return <main className="app-shell" onDragOver={e => { e.preventDefault(); setDragging(true) }} onDrop={e => acceptDrop(e)}>
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><ScanEye size={19}/></span><span>visual<span className="brand-light">delta</span></span><span className="studio-tag">STUDIO</span></a>
      <nav className="top-links"><a href="#workspace">Workspace</a><a href="#how-it-works">How it works</a></nav>
      <div className="top-actions"><span className="privacy"><LockKeyhole size={13}/> 100% local processing</span><button className="icon-btn" title="About VisualDelta" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}><CircleHelp size={17}/></button></div>
    </header>

    <section className="hero">
      <div className="eyebrow"><span className="live-dot"/> VISUAL QA WORKSPACE <span className="eyebrow-line"/></div>
      <h1>See every <span>change.</span></h1>
      <p>Pixel-level clarity for every iteration. Compare screenshots, inspect visual differences, and ship with confidence.</p>
    </section>

    <section className="workspace" id="workspace">
      <div className="section-head"><div><div className="section-kicker">01 / INPUTS</div><h2>Set up your comparison</h2></div><button className="text-button" onClick={reset}><X size={14}/> Clear all</button></div>
      <div className="upload-grid">
        {uploadCard('before')}<div className="swap-icon"><ArrowLeftRight size={17}/></div>{uploadCard('after')}
      </div>
      <input ref={inputA} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => e.target.files?.[0] && load(e.target.files[0], 'before')}/>
      <input ref={inputB} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => e.target.files?.[0] && load(e.target.files[0], 'after')}/>
      {error && <div role="alert" className="error">{error}</div>}
      <div className="workspace-divider"/>
      <div className="section-head result-head"><div><div className="section-kicker">02 / INSPECTION</div><h2>Explore the differences</h2></div><div className="result-actions">{before && after && <><button className="secondary-btn" onClick={exportReport}><FileImage size={15}/> Export report</button><button className="primary-btn" onClick={() => diffUrl && download(diffUrl, 'visual-delta-difference.png')}><ArrowDownToLine size={15}/> Export diff</button></>}</div></div>
      <div className="viewer-toolbar">
        <div className="mode-tabs" role="tablist" aria-label="Comparison view">{modes.map(m => <button key={m.id} className={mode === m.id ? 'active' : ''} role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>)}</div>
        <button className={`settings-toggle ${showSettings ? 'selected' : ''}`} onClick={() => setShowSettings(v => !v)}><Settings2 size={15}/> Adjust <ChevronDown size={13}/></button>
      </div>
      {showSettings && <div className="settings-panel">
        <label><span>Difference sensitivity <b>{threshold}</b></span><input type="range" min="0" max="100" value={threshold} onChange={e => setThreshold(Number(e.target.value))}/><small>Lower values detect subtle changes</small></label>
        <label><span>Difference intensity <b>{amplification}×</b></span><input type="range" min="1" max="8" value={amplification} onChange={e => setAmplification(Number(e.target.value))}/><small>Boost the visibility of changed pixels</small></label>
        <label className="select-setting"><span>Image alignment</span><select value={align} onChange={e => setAlign(e.target.value as 'top-left' | 'center')}><option value="top-left">Top left</option><option value="center">Center</option></select><small>Align images when dimensions differ</small></label>
      </div>}
      <div className="viewer">
        {!before || !after ? <div className="empty-view"><div className="empty-art"><Layers2 size={32}/><span><Sparkles size={16}/></span></div><h3>Your comparison starts here</h3><p>Add an original and an updated image to reveal every pixel that moved, changed, or disappeared.</p><div className="empty-hint"><MousePointer2 size={14}/> Add both images above to get started</div></div> :
          <div className="comparison-stage">
            <div className="stage-labels"><span>{mode === 'diff' ? 'DIFFERENCE MAP' : 'ORIGINAL / UPDATED'}</span><span>{before.width} × {before.height} &nbsp;→&nbsp; {after.width} × {after.height}</span></div>
            {mode === 'split' ? <div className="split-view"><div><span>ORIGINAL</span><img src={before.url} alt="Original image"/></div><div><span>UPDATED</span><img src={after.url} alt="Updated image"/></div></div> :
             mode === 'overlay' ? <div className="overlay-view"><img src={before.url} alt="Original image"/><img src={after.url} alt="Updated overlay" style={{ opacity: opacity / 100 }}/><input aria-label="Overlay opacity" type="range" min="0" max="100" value={opacity} onChange={e => setOpacity(Number(e.target.value))}/><span className="overlay-readout">{opacity}% opacity</span></div> :
             mode === 'wipe' ? <div className="wipe-view" ref={wipeRef} onPointerMove={e => e.buttons === 1 && moveWipe(e)} onPointerDown={moveWipe}><img src={after.url} alt="Updated image"/><div style={{ width: `${wipe}%` }}><img src={before.url} alt="Original image"/></div><span className="wipe-line" style={{ left: `${wipe}%` }}/><input aria-label="Wipe position" type="range" min="0" max="100" value={wipe} onChange={e => setWipe(Number(e.target.value))}/></div> :
             <div className="diff-view">{busy && <span className="processing">Calculating pixel differences…</span>}<canvas ref={canvasRef} aria-label="Pixel difference heatmap"/>{!busy && metrics?.changedPixels === 0 && <span className="no-diff"><Check size={16}/> No significant differences detected</span>}</div>}
          </div>}
      </div>
      {before && after && metrics && <div className="metrics-grid"><div className="metric"><span>Changed pixels</span><strong>{metrics.changedPixels.toLocaleString()}</strong><small>Pixels above threshold</small></div><div className="metric"><span>Difference</span><strong>{percent}<em>%</em></strong><small>Of total image area</small></div><div className="metric"><span>Total pixels</span><strong>{metrics.totalPixels.toLocaleString()}</strong><small>Comparison canvas</small></div><div className="metric"><span>Change bounds</span><strong>{metrics.bounds ? `${metrics.bounds.width} × ${metrics.bounds.height}` : '—'}</strong><small>{metrics.bounds ? `At ${metrics.bounds.x}, ${metrics.bounds.y}` : 'No changed region'}</small></div></div>}
      <canvas ref={canvasRef} className="hidden-canvas"/>
    </section>

    <section className="trust-strip"><div><ShieldCheck size={18}/><span><b>Your files stay yours.</b> Images never leave this browser.</span></div><div><Fingerprint size={18}/><span><b>No accounts.</b> No tracking. No uploads.</span></div><div><Activity size={18}/><span><b>Instant feedback.</b> Built for fast visual QA.</span></div></section>
    <section className="how-section" id="how-it-works"><div className="section-kicker">BUILT FOR THE DETAILS</div><h2>From pixel changes to clear decisions.</h2><div className="how-grid"><article><span>01</span><PanelTop size={21}/><h3>Bring both versions</h3><p>Drop in your original and updated screenshots. Common web image formats are supported.</p></article><article><span>02</span><Maximize2 size={21}/><h3>Inspect your way</h3><p>Switch between side-by-side, overlay, wipe, and a focused pixel difference map.</p></article><article><span>03</span><Upload size={21}/><h3>Share the evidence</h3><p>Export a crisp difference image or a portable HTML report for your review.</p></article></div></section>
    <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><ScanEye size={16}/></span><span>visual<span className="brand-light">delta</span></span></a><span>Designed for the pixels that matter.</span><span>© 2026 Akhil Alladi · <a href="https://github.com/akhilalladi-code/visual-delta-studio">GitHub</a></span></footer>
    {dragging && <div className="drag-overlay" onDragLeave={() => setDragging(false)}><div><ImagePlus size={32}/><strong>Drop to add image</strong><span>First image fills Original, second fills Updated</span></div></div>}
  </main>
}
export default App
