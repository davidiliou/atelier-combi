import type { Step } from '../types'

type Props = {
  steps: Step[]
  currentStepIndex: number
  onSelect: (index: number) => void
  onAdd: () => void
  onDuplicate: () => void
  onDelete: () => void
  onReorder: (from: number, to: number) => void
  onDurationChange: (index: number, durationMs: number) => void
}

export function StepTimeline({
  steps,
  currentStepIndex,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onReorder,
  onDurationChange,
}: Props) {
  return (
    <div className="timeline">
      <div className="timeline-header">
        <h3>Étapes</h3>
        <div className="timeline-actions">
          <button type="button" onClick={onAdd}>
            + Étape
          </button>
          <button type="button" onClick={onDuplicate} disabled={steps.length === 0}>
            Dupliquer
          </button>
          <button
            type="button"
            className="danger"
            onClick={onDelete}
            disabled={steps.length <= 1}
          >
            Supprimer
          </button>
        </div>
      </div>

      <ol className="timeline-list">
        {steps.map((step, index) => (
          <li key={step.id} className={index === currentStepIndex ? 'active' : ''}>
            <button type="button" className="step-chip" onClick={() => onSelect(index)}>
              <span className="step-label">{step.label}</span>
            </button>
            <label className="duration-field">
              <span>Durée</span>
              <input
                type="number"
                min={0}
                step={100}
                value={step.durationMs}
                disabled={index === 0}
                onChange={(e) => onDurationChange(index, Number(e.target.value) || 0)}
              />
              <span className="unit">ms</span>
            </label>
            <div className="reorder">
              <button
                type="button"
                aria-label="Monter"
                disabled={index === 0}
                onClick={() => onReorder(index, index - 1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Descendre"
                disabled={index === steps.length - 1}
                onClick={() => onReorder(index, index + 1)}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
