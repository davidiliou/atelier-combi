import type { Actor, FieldConfig, Step } from '../types'
import { drawScene, getPositionsAtTime } from '../preview/Animator'
import { getViewBox } from '../field/fieldGeometry'

const FPS = 30

export async function exportCombinationWebm(options: {
  title: string
  field: FieldConfig
  actors: Actor[]
  steps: Step[]
  width?: number
  onProgress?: (ratio: number) => void
}): Promise<Blob> {
  const width = options.width ?? 1280
  const view = getViewBox(options.field, width)
  const height = Math.round(view.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D indisponible')

  const stream = canvas.captureStream(FPS)
  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
  })

  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
    recorder.onerror = () => reject(new Error('Échec de l’enregistrement vidéo'))
  })

  const { totalMs } = getPositionsAtTime(options.steps, 0)
  const holdMs = 600
  const duration = Math.max(totalMs + holdMs, 1000)
  const frameCount = Math.ceil((duration / 1000) * FPS)

  recorder.start()

  for (let i = 0; i <= frameCount; i++) {
    const timeMs = (i / FPS) * 1000
    const { positions } = getPositionsAtTime(options.steps, Math.min(timeMs, totalMs))
    drawScene(ctx, options.field, options.actors, positions, width)
    options.onProgress?.(i / frameCount)
    await waitFrame()
  }

  // Hold last frame a bit more for MediaRecorder flush
  await sleep(200)
  recorder.stop()
  stream.getTracks().forEach((t) => t.stop())

  return done
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function pickMimeType() {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return 'video/webm'
}

function waitFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
