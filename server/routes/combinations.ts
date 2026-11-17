import { Router } from 'express'
import {
  createCombination,
  deleteCombination,
  duplicateCombination,
  getCombination,
  listCombinations,
  updateCombination,
} from '../db.ts'

export const combinationsRouter = Router()

combinationsRouter.get('/', (_req, res) => {
  res.json(listCombinations())
})

combinationsRouter.post('/', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title : undefined
  const created = createCombination(title)
  res.status(201).json(created)
})

combinationsRouter.post('/:id/duplicate', (req, res) => {
  const copy = duplicateCombination(req.params.id)
  if (!copy) {
    res.status(404).json({ error: 'Combinaison introuvable' })
    return
  }
  res.status(201).json(copy)
})

combinationsRouter.get('/:id', (req, res) => {
  const combination = getCombination(req.params.id)
  if (!combination) {
    res.status(404).json({ error: 'Combinaison introuvable' })
    return
  }
  res.json(combination)
})

combinationsRouter.put('/:id', (req, res) => {
  const { title, description, field, actors, steps } = req.body ?? {}
  const updated = updateCombination(req.params.id, {
    title,
    description,
    field,
    actors,
    steps,
  })
  if (!updated) {
    res.status(404).json({ error: 'Combinaison introuvable' })
    return
  }
  res.json(updated)
})

combinationsRouter.delete('/:id', (req, res) => {
  const ok = deleteCombination(req.params.id)
  if (!ok) {
    res.status(404).json({ error: 'Combinaison introuvable' })
    return
  }
  res.status(204).send()
})
