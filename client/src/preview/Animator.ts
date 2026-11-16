import type { Actor, FieldConfig, Position, Step } from '../types'
import { getViewBox, metersToPixels, pitchMarkings } from '../field/fieldGeometry'

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function interpolatePositions(
  from: Record<string, Position>,
  to: Record<string, Position>,
  t: number,
): Record<string, Position> {
  const ids = new Set([...Object.keys(from), ...Object.keys(to)])
  const result: Record<string, Position> = {}
  for (const id of ids) {
    const a = from[id] ?? to[id]
    const b = to[id] ?? from[id]
    if (!a || !b) continue
    result[id] = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
  }
  return result
}

export function getPositionsAtTime(
  steps: Step[],
  timeMs: number,
): { positions: Record<string, Position>; totalMs: number } {
  if (steps.length === 0) return { positions: {}, totalMs: 0 }
  if (steps.length === 1) return { positions: steps[0].positions, totalMs: 0 }

  let elapsed = 0
  const segments: Array<{ from: Step; to: Step; start: number; duration: number }> = []
  for (let i = 1; i < steps.length; i++) {
    const duration = Math.max(0, steps[i].durationMs)
    segments.push({ from: steps[i - 1], to: steps[i], start: elapsed, duration })
    elapsed += duration
  }
  const totalMs = elapsed

  if (timeMs <= 0) return { positions: steps[0].positions, totalMs }
  if (timeMs >= totalMs) return { positions: steps[steps.length - 1].positions, totalMs }

  const seg = segments.find((s) => timeMs >= s.start && timeMs <= s.start + s.duration) ?? segments[segments.length - 1]
  const t = seg.duration === 0 ? 1 : (timeMs - seg.start) / seg.duration
  return {
    positions: interpolatePositions(seg.from.positions, seg.to.positions, Math.min(1, Math.max(0, t))),
    totalMs,
  }
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  field: FieldConfig,
  actors: Actor[],
  positions: Record<string, Position>,
  canvasWidth: number,
) {
  const view = getViewBox(field, canvasWidth)
  const canvasHeight = view.height
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight)
  grad.addColorStop(0, '#2f7a3e')
  grad.addColorStop(0.5, '#246833')
  grad.addColorStop(1, '#1d5629')
  ctx.fillStyle = grad
  roundRect(ctx, 0, 0, canvasWidth, canvasHeight, 8)
  ctx.fill()

  if (field.showGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    for (let x = 5; x < field.widthM; x += 5) {
      const a = metersToPixels({ x, y: 0 }, field, view)
      const b = metersToPixels({ x, y: field.heightM }, field, view)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    for (let y = 5; y < field.heightM; y += 5) {
      const a = metersToPixels({ x: 0, y }, field, view)
      const b = metersToPixels({ x: field.widthM, y }, field, view)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }

  const markings = pitchMarkings(field)
  for (const l of markings.lines) {
    const a = metersToPixels({ x: l.x1, y: l.y1 }, field, view)
    const b = metersToPixels({ x: l.x2, y: l.y2 }, field, view)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = l.dashed ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)'
    ctx.lineWidth = l.goal ? 3.5 : l.dashed ? 1.5 : 2.5
    ctx.setLineDash(l.dashed ? [7, 6] : [])
    ctx.stroke()
  }
  ctx.setLineDash([])

  const fontSize = Math.max(13, view.width * 0.022)
  ctx.font = `700 ${fontSize}px Source Sans 3, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const label of markings.labels) {
    const px = metersToPixels(label, field, view)
    const chipW = fontSize * 1.7
    const chipH = fontSize * 1.25
    ctx.fillStyle = 'rgba(8, 28, 14, 0.82)'
    roundRect(ctx, px.x - chipW / 2, px.y - chipH / 2, chipW, chipH, 4)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(label.text, px.x, px.y)
  }

  for (const actor of actors) {
    const pos = positions[actor.id]
    if (!pos) continue
    const px = metersToPixels(pos, field, view)
    if (actor.kind === 'ball') {
      ctx.beginPath()
      ctx.ellipse(px.x, px.y, 10, 7, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#c45c16'
      ctx.fill()
      ctx.strokeStyle = '#5a2a0a'
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(px.x, px.y, 16, 0, Math.PI * 2)
      ctx.fillStyle = actor.kind === 'player' ? '#1e4d8c' : '#8b1e1e'
      ctx.fill()
      ctx.strokeStyle = '#0b1220'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = '700 12px Source Sans 3, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(actor.label, px.x, px.y)
    }
  }

  return { width: canvasWidth, height: canvasHeight }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
