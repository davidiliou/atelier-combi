export type ActorKind = 'player' | 'opponent' | 'ball'

export type Actor = {
  id: string
  kind: ActorKind
  label: string
  number?: number
}

export type Position = { x: number; y: number }

export type FieldConfig = {
  mode: 'full' | 'zone'
  /** For full: half or full pitch width in meters along X (touchline). Default half = 50 */
  widthM: number
  /** Depth in meters along Y (goal line direction). Default half = 70 (22+22+in-goal approx) or full 100 */
  heightM: number
  showGrid?: boolean
}

export type Step = {
  id: string
  label: string
  /** Duration of transition TO this step from the previous one */
  durationMs: number
  positions: Record<string, Position>
}

export type Combination = {
  id: string
  title: string
  description: string
  field: FieldConfig
  actors: Actor[]
  steps: Step[]
  createdAt: string
  updatedAt: string
}

export type CombinationSummary = {
  id: string
  title: string
  description: string
  stepCount: number
  actorCount: number
  createdAt: string
  updatedAt: string
}

export function createDefaultCombination(title = 'Nouvelle combinaison'): Omit<Combination, 'id' | 'createdAt' | 'updatedAt'> {
  const playerIds = ['p1', 'p2', 'p3']
  const opponentIds = ['o1', 'o2']
  const ballId = 'ball'

  return {
    title,
    description: '',
    field: {
      mode: 'full',
      widthM: 70,
      heightM: 50,
      showGrid: false,
    },
    actors: [
      { id: playerIds[0], kind: 'player', label: '9', number: 9 },
      { id: playerIds[1], kind: 'player', label: '10', number: 10 },
      { id: playerIds[2], kind: 'player', label: '12', number: 12 },
      { id: opponentIds[0], kind: 'opponent', label: 'D1' },
      { id: opponentIds[1], kind: 'opponent', label: 'D2' },
      { id: ballId, kind: 'ball', label: 'Ballon' },
    ],
    steps: [
      {
        id: 'step-a',
        label: 'A',
        durationMs: 0,
        positions: {
          p1: { x: 20, y: 25 },
          p2: { x: 28, y: 22 },
          p3: { x: 36, y: 20 },
          o1: { x: 45, y: 28 },
          o2: { x: 52, y: 24 },
          ball: { x: 21, y: 25 },
        },
      },
      {
        id: 'step-2',
        label: '2',
        durationMs: 1000,
        positions: {
          p1: { x: 26, y: 27 },
          p2: { x: 34, y: 24 },
          p3: { x: 42, y: 18 },
          o1: { x: 48, y: 30 },
          o2: { x: 55, y: 22 },
          ball: { x: 35, y: 24 },
        },
      },
    ],
  }
}
