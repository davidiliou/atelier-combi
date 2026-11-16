export type ActorKind = 'player' | 'opponent' | 'ball'

export type Actor = {
  id: string
  kind: ActorKind
  label: string
  number?: number
}

export type Position = { x: number; y: number }

export type FieldConfig = {
  /** `full` = demi-terrain (50 m), `complete` = terrain complet (100 m), `zone` = extrait. */
  mode: 'full' | 'complete' | 'zone'
  /** Largeur entre les lignes de touche, en mètres. Terrain réglementaire : 70. */
  widthM: number
  /** Profondeur depuis la ligne d’en-but proche, en mètres. Demi = 50, complet = 100. */
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
