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
  widthM: number
  heightM: number
  showGrid?: boolean
}

export type Step = {
  id: string
  label: string
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
