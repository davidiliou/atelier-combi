import type { FieldConfig, Position } from '../types'

export type ViewBox = {
  width: number
  height: number
  padding: number
}

/** Metres the goal uprights extend behind the try line, into the margin. */
const GOAL_POST_OUT_M = 2.6

export function getViewBox(field: FieldConfig, pixelWidth: number): ViewBox {
  const aspect = field.widthM / field.heightM
  const width = pixelWidth
  const height = width / aspect
  const padding =
    field.mode === 'zone' ? 16 : Math.max(28, (GOAL_POST_OUT_M * width) / field.widthM + 10)
  return { width, height, padding }
}

export function metersToPixels(
  pos: Position,
  field: FieldConfig,
  view: ViewBox,
): { x: number; y: number } {
  const usableW = view.width - view.padding * 2
  const usableH = view.height - view.padding * 2
  return {
    x: view.padding + (pos.x / field.widthM) * usableW,
    y: view.padding + (pos.y / field.heightM) * usableH,
  }
}

export function pixelsToMeters(
  px: { x: number; y: number },
  field: FieldConfig,
  view: ViewBox,
): Position {
  const usableW = view.width - view.padding * 2
  const usableH = view.height - view.padding * 2
  const x = ((px.x - view.padding) / usableW) * field.widthM
  const y = ((px.y - view.padding) / usableH) * field.heightM
  return {
    x: Math.min(field.widthM, Math.max(0, x)),
    y: Math.min(field.heightM, Math.max(0, y)),
  }
}

export type PitchLine = {
  x1: number
  y1: number
  x2: number
  y2: number
  dashed?: boolean
  /** Goal uprights and crossbar, drawn a little heavier. */
  goal?: boolean
}

export type PitchLabel = {
  x: number
  y: number
  text: string
}

export type PitchMarkings = {
  lines: PitchLine[]
  labels: PitchLabel[]
}

const POST_GAP_M = 5.6
const POST_IN_M = 1.3

/**
 * Pitch markings in metres.
 * Origin: x = 0 on the left touchline, y = 0 on the near try line.
 * Half pitch (`full`) is 50 m deep; full pitch (`complete`) is 100 m, mirrored.
 */
export function pitchMarkings(field: FieldConfig): PitchMarkings {
  const { widthM, heightM, mode } = field
  const lines: PitchLine[] = [
    { x1: 0, y1: 0, x2: widthM, y2: 0 },
    { x1: 0, y1: heightM, x2: widthM, y2: heightM },
    { x1: 0, y1: 0, x2: 0, y2: heightM },
    { x1: widthM, y1: 0, x2: widthM, y2: heightM },
  ]
  const labels: PitchLabel[] = []

  if (mode === 'zone') return { lines, labels }

  const marks = new Map<string, { y: number; dashed: boolean; label?: string }>()
  const addMark = (y: number, dashed: boolean, label?: string) => {
    if (y < -0.05 || y > heightM + 0.05) return
    const key = y.toFixed(2)
    const prev = marks.get(key)
    if (!prev) {
      marks.set(key, { y, dashed, label })
      return
    }
    marks.set(key, {
      y,
      dashed: prev.dashed && dashed,
      label: prev.label ?? label,
    })
  }

  const fromTryLine = (origin: number, direction: 1 | -1) => {
    addMark(origin + direction * 5, true)
    addMark(origin + direction * 22, false)
    addMark(origin + direction * 40, true)
  }

  fromTryLine(0, 1)
  if (mode === 'complete') fromTryLine(heightM, -1)
  addMark(50, false, '50')

  for (const mark of marks.values()) {
    const onEdge = mark.y <= 0.05 || mark.y >= heightM - 0.05
    if (!onEdge) {
      lines.push({ x1: 0, y1: mark.y, x2: widthM, y2: mark.y, dashed: mark.dashed })
    }
    if (mark.label) labels.push({ x: widthM / 2, y: mark.y, text: mark.label })
  }

  // 5 m and 15 m from each touchline, parallel to them.
  for (const x of [5, 15, widthM - 15, widthM - 5]) {
    if (x > 0.4 && x < widthM - 0.4) {
      lines.push({ x1: x, y1: 0, x2: x, y2: heightM, dashed: true })
    }
  }

  addGoalPosts(lines, widthM, 0, 1)
  if (mode === 'complete') addGoalPosts(lines, widthM, heightM, -1)

  return { lines, labels }
}

function addGoalPosts(lines: PitchLine[], widthM: number, tryY: number, inward: 1 | -1) {
  const left = widthM / 2 - POST_GAP_M / 2
  const right = widthM / 2 + POST_GAP_M / 2
  const yOut = tryY - inward * GOAL_POST_OUT_M
  const yIn = tryY + inward * POST_IN_M
  lines.push(
    { x1: left, y1: yOut, x2: left, y2: yIn, goal: true },
    { x1: right, y1: yOut, x2: right, y2: yIn, goal: true },
    { x1: left, y1: tryY, x2: right, y2: tryY, goal: true },
  )
}
