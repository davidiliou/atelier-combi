import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Combination, CombinationSummary } from './types.ts'
import { createDefaultCombination } from './types.ts'
import { randomUUID } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(__dirname, '../data')
const dbPath = path.join(dataDir, 'atelier-combi.db')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new DatabaseSync(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS combinations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

function rowToCombination(row: {
  id: string
  title: string
  description: string
  data: string
  created_at: string
  updated_at: string
}): Combination {
  const parsed = JSON.parse(row.data) as Omit<Combination, 'id' | 'title' | 'description' | 'createdAt' | 'updatedAt'>
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    field: parsed.field,
    actors: parsed.actors,
    steps: parsed.steps,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listCombinations(): CombinationSummary[] {
  const rows = db
    .prepare(
      `SELECT id, title, description, data, created_at, updated_at
       FROM combinations
       ORDER BY updated_at DESC`,
    )
    .all() as Array<{
    id: string
    title: string
    description: string
    data: string
    created_at: string
    updated_at: string
  }>

  return rows.map((row) => {
    const data = JSON.parse(row.data) as { actors: unknown[]; steps: unknown[] }
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      stepCount: data.steps?.length ?? 0,
      actorCount: data.actors?.length ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

export function getCombination(id: string): Combination | null {
  const row = db
    .prepare(
      `SELECT id, title, description, data, created_at, updated_at
       FROM combinations WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string
        title: string
        description: string
        data: string
        created_at: string
        updated_at: string
      }
    | undefined

  if (!row) return null
  return rowToCombination(row)
}

export function createCombination(title?: string): Combination {
  const id = randomUUID()
  const now = new Date().toISOString()
  const defaults = createDefaultCombination(title ?? 'Nouvelle combinaison')
  const payload = {
    field: defaults.field,
    actors: defaults.actors,
    steps: defaults.steps,
  }

  db.prepare(
    `INSERT INTO combinations (id, title, description, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, defaults.title, defaults.description, JSON.stringify(payload), now, now)

  return {
    id,
    title: defaults.title,
    description: defaults.description,
    ...payload,
    createdAt: now,
    updatedAt: now,
  }
}

export function updateCombination(
  id: string,
  input: Partial<Pick<Combination, 'title' | 'description' | 'field' | 'actors' | 'steps'>>,
): Combination | null {
  const existing = getCombination(id)
  if (!existing) return null

  const updated: Combination = {
    ...existing,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    field: input.field ?? existing.field,
    actors: input.actors ?? existing.actors,
    steps: input.steps ?? existing.steps,
    updatedAt: new Date().toISOString(),
  }

  const payload = {
    field: updated.field,
    actors: updated.actors,
    steps: updated.steps,
  }

  db.prepare(
    `UPDATE combinations
     SET title = ?, description = ?, data = ?, updated_at = ?
     WHERE id = ?`,
  ).run(updated.title, updated.description, JSON.stringify(payload), updated.updatedAt, id)

  return updated
}

export function duplicateCombination(id: string): Combination | null {
  const existing = getCombination(id)
  if (!existing) return null

  const newId = randomUUID()
  const now = new Date().toISOString()
  const title = `${existing.title} (copie)`
  const payload = {
    field: structuredClone(existing.field),
    actors: structuredClone(existing.actors),
    steps: structuredClone(existing.steps),
  }

  db.prepare(
    `INSERT INTO combinations (id, title, description, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(newId, title, existing.description, JSON.stringify(payload), now, now)

  return {
    id: newId,
    title,
    description: existing.description,
    ...payload,
    createdAt: now,
    updatedAt: now,
  }
}

export function deleteCombination(id: string): boolean {
  const result = db.prepare(`DELETE FROM combinations WHERE id = ?`).run(id)
  return Number(result.changes) > 0
}
