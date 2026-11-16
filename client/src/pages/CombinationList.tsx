import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createCombination, deleteCombination, listCombinations } from '../api/combinations'
import type { CombinationSummary } from '../types'

export function CombinationList() {
  const [items, setItems] = useState<CombinationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setItems(await listCombinations())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleCreate() {
    const created = await createCombination()
    navigate(`/combinations/${created.id}`)
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer « ${title} » ?`)) return
    await deleteCombination(id)
    await refresh()
  }

  return (
    <div className="page list-page">
      <header className="page-header">
        <div>
          <p className="brand">Atelier Combi</p>
          <h1>Combinaisons</h1>
          <p className="subtitle">Préparez vos mouvements étape par étape sur le terrain.</p>
        </div>
        <button type="button" className="primary" onClick={() => void handleCreate()}>
          Nouvelle combinaison
        </button>
      </header>

      {loading && <p className="muted">Chargement…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <p>Aucune combinaison pour l’instant.</p>
          <button type="button" className="primary" onClick={() => void handleCreate()}>
            Créer la première
          </button>
        </div>
      )}

      <ul className="combi-list">
        {items.map((item) => (
          <li key={item.id}>
            <Link to={`/combinations/${item.id}`} className="combi-card">
              <div>
                <h2>{item.title}</h2>
                <p className="muted">
                  {item.stepCount} étape{item.stepCount > 1 ? 's' : ''} · {item.actorCount} acteur
                  {item.actorCount > 1 ? 's' : ''}
                </p>
              </div>
              <time dateTime={item.updatedAt}>
                {new Date(item.updatedAt).toLocaleString('fr-FR')}
              </time>
            </Link>
            <button
              type="button"
              className="danger ghost"
              onClick={() => void handleDelete(item.id, item.title)}
            >
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
