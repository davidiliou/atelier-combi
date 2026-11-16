import type { FieldConfig, Position } from '../types'

export type ViewBox = {
  width: number
  height: number
  padding: number
}

export function getViewBox(field: FieldConfig, pixelWidth: number): ViewBox {
  const aspect = field.widthM / field.heightM
  const width = pixelWidth
  const height = width / aspect
  return { width, height, padding: 16 }
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

/** Draw rugby pitch markings in meters space (caller transforms) */
export function pitchMarkings(field: FieldConfig): Array<{ x1: number; y1: number; x2: number; y2: number; dashed?: boolean }> {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; dashed?: boolean }> = []
  const { widthM, heightM, mode } = field

  // Outer boundary always present
  // Horizontal lines (across width) at key depths when mode=full
  if (mode === 'full') {
    const candidates = [0, 5, 22, 40, 50, heightM - 22, heightM - 5, heightM]
    const unique = [...new Set(candidates.filter((y) => y >= 0 && y <= heightM))]
    for (const y of unique) {
      lines.push({ x1: 0, y1: y, x2: widthM, y2: y, dashed: y !== 0 && y !== heightM && y !== 22 && y !== heightM - 22 })
    }
    // Halfway suggestion if height covers it
    if (heightM >= 50) {
      lines.push({ x1: 0, y1: heightM / 2, x2: widthM, y2: heightM / 2 })
    }
  } else {
    lines.push({ x1: 0, y1: 0, x2: widthM, y2: 0 })
    lines.push({ x1: 0, y1: heightM, x2: widthM, y2: heightM })
  }

  // Touchlines
  lines.push({ x1: 0, y1: 0, x2: 0, y2: heightM })
  lines.push({ x1: widthM, y1: 0, x2: widthM, y2: heightM })

  return lines
}
