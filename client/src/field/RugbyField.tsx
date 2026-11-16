import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Actor, FieldConfig, Position } from '../types'
import { getViewBox, metersToPixels, pixelsToMeters, pitchMarkings } from './fieldGeometry'

type Props = {
  field: FieldConfig
  actors: Actor[]
  positions: Record<string, Position>
  selectedActorId: string | null
  onSelectActor: (id: string | null) => void
  onMoveActor: (id: string, pos: Position) => void
  width?: number
}

export function RugbyField({
  field,
  actors,
  positions,
  selectedActorId,
  onSelectActor,
  onMoveActor,
  width = 900,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const view = useMemo(() => getViewBox(field, width), [field, width])
  const markings = useMemo(() => pitchMarkings(field), [field])
  const [dragging, setDragging] = useState<string | null>(null)

  function clientToSvg(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const local = pt.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }

  function handlePointerDown(actorId: string, e: ReactPointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    setDragging(actorId)
    onSelectActor(actorId)
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!dragging) return
    const local = clientToSvg(e.clientX, e.clientY)
    const meters = pixelsToMeters(local, field, view)
    onMoveActor(dragging, meters)
  }

  function handlePointerUp(e: ReactPointerEvent) {
    if (!dragging) return
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    setDragging(null)
  }

  const gridLines = useMemo(() => {
    if (!field.showGrid) return []
    const step = 5
    const result: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    for (let x = step; x < field.widthM; x += step) {
      result.push({ x1: x, y1: 0, x2: x, y2: field.heightM })
    }
    for (let y = step; y < field.heightM; y += step) {
      result.push({ x1: 0, y1: y, x2: field.widthM, y2: y })
    }
    return result
  }, [field])

  return (
    <svg
      ref={svgRef}
      className="rugby-field"
      viewBox={`0 0 ${view.width} ${view.height}`}
      width="100%"
      role="img"
      aria-label="Terrain de rugby"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={() => onSelectActor(null)}
    >
      <defs>
        <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f7a3e" />
          <stop offset="50%" stopColor="#246833" />
          <stop offset="100%" stopColor="#1d5629" />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={view.width} height={view.height} fill="url(#pitchGrad)" rx={8} />

      {gridLines.map((l, i) => {
        const a = metersToPixels({ x: l.x1, y: l.y1 }, field, view)
        const b = metersToPixels({ x: l.x2, y: l.y2 }, field, view)
        return (
          <line
            key={`g-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />
        )
      })}

      {markings.lines.map((l, i) => {
        const a = metersToPixels({ x: l.x1, y: l.y1 }, field, view)
        const b = metersToPixels({ x: l.x2, y: l.y2 }, field, view)
        return (
          <line
            key={`l-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={l.dashed ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)'}
            strokeWidth={l.goal ? 3.5 : l.dashed ? 1.5 : 2.5}
            strokeDasharray={l.dashed ? '7 6' : undefined}
            strokeLinecap="butt"
          />
        )
      })}

      {markings.labels.map((label) => {
        const px = metersToPixels(label, field, view)
        const fontSize = Math.max(13, view.width * 0.022)
        const chipW = fontSize * 1.7
        const chipH = fontSize * 1.25
        return (
          <g key={label.text} transform={`translate(${px.x}, ${px.y})`}>
            <rect
              x={-chipW / 2}
              y={-chipH / 2}
              width={chipW}
              height={chipH}
              rx={4}
              fill="rgba(8, 28, 14, 0.82)"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize={fontSize}
              fontWeight={700}
              fontFamily="Source Sans 3, sans-serif"
            >
              {label.text}
            </text>
          </g>
        )
      })}

      {actors.map((actor) => {
        const pos = positions[actor.id]
        if (!pos) return null
        const px = metersToPixels(pos, field, view)
        const selected = selectedActorId === actor.id
        return (
          <ActorMarker
            key={actor.id}
            actor={actor}
            x={px.x}
            y={px.y}
            selected={selected}
            onPointerDown={(e) => handlePointerDown(actor.id, e)}
          />
        )
      })}
    </svg>
  )
}

function ActorMarker({
  actor,
  x,
  y,
  selected,
  onPointerDown,
}: {
  actor: Actor
  x: number
  y: number
  selected: boolean
  onPointerDown: (e: ReactPointerEvent) => void
}) {
  if (actor.kind === 'ball') {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        style={{ cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onClick={(e) => e.stopPropagation()}
      >
        <ellipse
          rx={10}
          ry={7}
          fill="#c45c16"
          stroke={selected ? '#ffe08a' : '#5a2a0a'}
          strokeWidth={selected ? 3 : 1.5}
        />
        <line x1={-6} y1={0} x2={6} y2={0} stroke="#5a2a0a" strokeWidth={1} />
      </g>
    )
  }

  const fill = actor.kind === 'player' ? '#1e4d8c' : '#8b1e1e'
  const stroke = selected ? '#ffe08a' : '#0b1220'
  const r = 16

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: 'grab' }}
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
    >
      <circle r={r} fill={fill} stroke={stroke} strokeWidth={selected ? 3 : 2} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={12}
        fontWeight={700}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {actor.label}
      </text>
    </g>
  )
}
