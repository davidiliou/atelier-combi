import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCombination, updateCombination } from '../api/combinations'
import { RugbyField } from '../field/RugbyField'
import { StepTimeline } from '../timeline/StepTimeline'
import { drawScene, getPositionsAtTime } from '../preview/Animator'
import { downloadBlob, exportCombinationWebm } from '../export/exportWebm'
import type { Actor, Combination, FieldConfig, Position, Step } from '../types'

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function readCollapsed(storageKey: string) {
  try {
    return localStorage.getItem(storageKey) === '1'
  } catch {
    return false
  }
}

function CollapsibleSection({
  title,
  storageKey,
  children,
}: {
  title: string
  storageKey: string
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey))

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKey, next ? '1' : '0')
      } catch {
        /* localStorage indisponible */
      }
      return next
    })
  }

  return (
    <section className={collapsed ? 'is-collapsed' : undefined}>
      <h3>
        <button
          type="button"
          className="section-toggle"
          aria-expanded={!collapsed}
          aria-controls={storageKey}
          onClick={toggle}
        >
          <span>{title}</span>
          <span className="chevron" aria-hidden="true" />
        </button>
      </h3>
      {!collapsed && (
        <div className="section-body" id={storageKey}>
          {children}
        </div>
      )}
    </section>
  )
}

export function CombinationEditor() {
  const { id } = useParams<{ id: string }>()
  const [combi, setCombi] = useState<Combination | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1)
  const [playTimeMs, setPlayTimeMs] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const playRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)

  useEffect(() => {
    if (!id) return
    void getCombination(id)
      .then((data) => {
        setCombi(data)
        setCurrentStepIndex(0)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
  }, [id])

  const currentStep = combi?.steps[currentStepIndex]
  const selectedActor = combi?.actors.find((a) => a.id === selectedActorId) ?? null

  const previewPositions = useMemo(() => {
    if (!combi) return {}
    if (playing) {
      return getPositionsAtTime(combi.steps, playTimeMs).positions
    }
    return currentStep?.positions ?? {}
  }, [combi, playing, playTimeMs, currentStep])

  useEffect(() => {
    if (!combi || !previewRef.current) return
    const canvas = previewRef.current
    const width = 640
    const aspect = combi.field.widthM / combi.field.heightM
    const height = Math.round(width / aspect)
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawScene(ctx, combi.field, combi.actors, previewPositions, width)
  }, [combi, previewPositions])

  useEffect(() => {
    if (!playing || !combi) return
    const { totalMs } = getPositionsAtTime(combi.steps, 0)

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = ts - lastTsRef.current
      lastTsRef.current = ts
      setPlayTimeMs((t) => {
        const next = t + dt * playSpeed
        if (next >= totalMs + 400) {
          setPlaying(false)
          return 0
        }
        return next
      })
      playRef.current = requestAnimationFrame(tick)
    }

    playRef.current = requestAnimationFrame(tick)
    return () => {
      if (playRef.current) cancelAnimationFrame(playRef.current)
      lastTsRef.current = null
    }
  }, [playing, combi, playSpeed])

  const update = useCallback((patch: Partial<Combination>) => {
    setCombi((prev) => (prev ? { ...prev, ...patch } : prev))
    setSaveMsg(null)
  }, [])

  function updateStepPositions(actorId: string, pos: Position) {
    if (!combi || !currentStep) return
    const steps = combi.steps.map((s, i) =>
      i === currentStepIndex
        ? { ...s, positions: { ...s.positions, [actorId]: pos } }
        : s,
    )
    update({ steps })
  }

  function updateField(patch: Partial<FieldConfig>) {
    if (!combi) return
    update({ field: { ...combi.field, ...patch } })
  }

  function addActor(kind: Actor['kind']) {
    if (!combi) return
    const idNew = uid(kind)
    let label = 'J'
    let number: number | undefined
    if (kind === 'player') {
      const nums = combi.actors.filter((a) => a.kind === 'player').map((a) => a.number ?? 0)
      number = (nums.length ? Math.max(...nums) : 0) + 1
      label = String(number)
    } else if (kind === 'opponent') {
      const count = combi.actors.filter((a) => a.kind === 'opponent').length + 1
      label = `D${count}`
    } else {
      label = 'Ballon'
    }

    const actor: Actor = { id: idNew, kind, label, number }
    const center: Position = {
      x: combi.field.widthM / 2,
      y: combi.field.heightM / 2,
    }
    const steps = combi.steps.map((s) => ({
      ...s,
      positions: { ...s.positions, [idNew]: { ...center } },
    }))
    update({ actors: [...combi.actors, actor], steps })
    setSelectedActorId(idNew)
  }

  function removeSelectedActor() {
    if (!combi || !selectedActorId) return
    if (selectedActor?.kind === 'ball') {
      const balls = combi.actors.filter((a) => a.kind === 'ball')
      if (balls.length <= 1) {
        alert('Conservez au moins un ballon.')
        return
      }
    }
    const actors = combi.actors.filter((a) => a.id !== selectedActorId)
    const steps = combi.steps.map((s) => {
      const positions = { ...s.positions }
      delete positions[selectedActorId]
      return { ...s, positions }
    })
    update({ actors, steps })
    setSelectedActorId(null)
  }

  function renameSelected(label: string) {
    if (!combi || !selectedActorId) return
    const actors = combi.actors.map((a) =>
      a.id === selectedActorId
        ? { ...a, label, number: a.kind === 'player' ? Number(label) || a.number : a.number }
        : a,
    )
    update({ actors })
  }

  function addStep() {
    if (!combi) return
    const last = combi.steps[combi.steps.length - 1]
    const step: Step = {
      id: uid('step'),
      label: String(combi.steps.length + 1),
      durationMs: 1000,
      positions: structuredClone(last.positions),
    }
    update({ steps: [...combi.steps, step] })
    setCurrentStepIndex(combi.steps.length)
  }

  function duplicateStep() {
    if (!combi || !currentStep) return
    const step: Step = {
      id: uid('step'),
      label: `${currentStep.label}'`,
      durationMs: currentStep.durationMs || 1000,
      positions: structuredClone(currentStep.positions),
    }
    const steps = [...combi.steps]
    steps.splice(currentStepIndex + 1, 0, step)
    update({ steps })
    setCurrentStepIndex(currentStepIndex + 1)
  }

  function deleteStep() {
    if (!combi || combi.steps.length <= 1) return
    const steps = combi.steps.filter((_, i) => i !== currentStepIndex)
    if (steps[0]) steps[0] = { ...steps[0], durationMs: 0 }
    update({ steps })
    setCurrentStepIndex(Math.max(0, currentStepIndex - 1))
  }

  function reorderSteps(from: number, to: number) {
    if (!combi) return
    const steps = [...combi.steps]
    const [moved] = steps.splice(from, 1)
    steps.splice(to, 0, moved)
    steps[0] = { ...steps[0], durationMs: 0 }
    update({ steps })
    setCurrentStepIndex(to)
  }

  function changeDuration(index: number, durationMs: number) {
    if (!combi) return
    const steps = combi.steps.map((s, i) => (i === index ? { ...s, durationMs } : s))
    update({ steps })
  }

  async function handleSave() {
    if (!combi) return
    setSaving(true)
    setError(null)
    try {
      const saved = await updateCombination(combi.id, {
        title: combi.title,
        description: combi.description,
        field: combi.field,
        actors: combi.actors,
        steps: combi.steps,
      })
      setCombi(saved)
      setSaveMsg('Enregistré')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    if (!combi) return
    setExporting(true)
    setExportProgress(0)
    try {
      const blob = await exportCombinationWebm({
        title: combi.title,
        field: combi.field,
        actors: combi.actors,
        steps: combi.steps,
        onProgress: setExportProgress,
      })
      const safe = combi.title.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'combinaison'
      downloadBlob(blob, `${safe}.webm`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export impossible')
    } finally {
      setExporting(false)
    }
  }

  if (error && !combi) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <Link to="/">Retour</Link>
      </div>
    )
  }

  if (!combi || !currentStep) {
    return (
      <div className="page">
        <p className="muted">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="page editor-page">
      <header className="editor-header">
        <div className="editor-title">
          <Link to="/" className="back">
            ← Combinaisons
          </Link>
          <input
            className="title-input"
            value={combi.title}
            onChange={(e) => update({ title: e.target.value })}
            aria-label="Titre"
          />
        </div>
        <div className="editor-actions">
          {saveMsg && <span className="save-msg">{saveMsg}</span>}
          {error && <span className="error">{error}</span>}
          <button type="button" className="primary" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" disabled={exporting} onClick={() => void handleExport()}>
            {exporting ? `Export ${Math.round(exportProgress * 100)}%` : 'Exporter WebM'}
          </button>
        </div>
      </header>

      <div className="editor-layout">
        <aside className="side-panel">
          <CollapsibleSection title="Terrain" storageKey="atelier-combi-panel-terrain">
            <label className="field-row">
              Mode
              <select
                value={combi.field.mode}
                onChange={(e) => {
                  const mode = e.target.value as FieldConfig['mode']
                  if (mode === 'full') {
                    updateField({ mode, widthM: 70, heightM: 50 })
                  } else {
                    updateField({ mode, widthM: 20, heightM: 15 })
                  }
                }}
              >
                <option value="full">Demi-terrain</option>
                <option value="zone">Zone</option>
              </select>
            </label>
            <label className="field-row">
              Largeur (m)
              <input
                type="number"
                min={5}
                max={120}
                value={combi.field.widthM}
                onChange={(e) => updateField({ widthM: Number(e.target.value) || 5 })}
              />
            </label>
            <label className="field-row">
              Profondeur (m)
              <input
                type="number"
                min={5}
                max={120}
                value={combi.field.heightM}
                onChange={(e) => updateField({ heightM: Number(e.target.value) || 5 })}
              />
            </label>
            <label className="field-row checkbox">
              <input
                type="checkbox"
                checked={!!combi.field.showGrid}
                onChange={(e) => updateField({ showGrid: e.target.checked })}
              />
              Grille 5 m
            </label>
          </CollapsibleSection>

          <CollapsibleSection title="Acteurs" storageKey="atelier-combi-panel-acteurs">
            <div className="actor-buttons">
              <button type="button" onClick={() => addActor('player')}>
                + Joueur
              </button>
              <button type="button" onClick={() => addActor('opponent')}>
                + Adversaire
              </button>
              <button type="button" onClick={() => addActor('ball')}>
                + Ballon
              </button>
            </div>
            {selectedActor ? (
              <div className="selected-actor">
                <label className="field-row">
                  Label
                  <input
                    value={selectedActor.label}
                    onChange={(e) => renameSelected(e.target.value)}
                  />
                </label>
                <p className="muted">
                  Type : {selectedActor.kind === 'player' ? 'joueur' : selectedActor.kind === 'opponent' ? 'adversaire' : 'ballon'}
                </p>
                <button type="button" className="danger" onClick={removeSelectedActor}>
                  Retirer
                </button>
              </div>
            ) : (
              <p className="muted">Sélectionnez un pion sur le terrain.</p>
            )}
          </CollapsibleSection>
        </aside>

        <main className="field-panel">
          <div className="field-toolbar">
            <span>
              Étape <strong>{currentStep.label}</strong>
              {playing ? ' · lecture' : ' · édition'}
            </span>
            <div className="playback">
              <button
                type="button"
                onClick={() => {
                  setPlayTimeMs(0)
                  setPlaying(true)
                }}
              >
                ▶ Play
              </button>
              <button type="button" onClick={() => setPlaying(false)} disabled={!playing}>
                Pause
              </button>
              <label>
                Vitesse
                <select
                  value={playSpeed}
                  onChange={(e) => setPlaySpeed(Number(e.target.value))}
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={1.5}>1.5×</option>
                  <option value={2}>2×</option>
                </select>
              </label>
            </div>
          </div>

          <div className="field-stage">
            <div className="field-column">
              <RugbyField
                field={combi.field}
                actors={combi.actors}
                positions={playing ? previewPositions : currentStep.positions}
                selectedActorId={selectedActorId}
                onSelectActor={setSelectedActorId}
                onMoveActor={updateStepPositions}
              />

              <div className="preview-block">
                <h3>Aperçu canvas (export)</h3>
                <canvas ref={previewRef} className="preview-canvas" />
              </div>
            </div>

            <div className="steps-column">
              <StepTimeline
                steps={combi.steps}
                currentStepIndex={currentStepIndex}
                onSelect={setCurrentStepIndex}
                onAdd={addStep}
                onDuplicate={duplicateStep}
                onDelete={deleteStep}
                onReorder={reorderSteps}
                onDurationChange={changeDuration}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
