import type { Combination, CombinationSummary } from '../types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `Erreur HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function listCombinations() {
  return request<CombinationSummary[]>('/api/combinations')
}

export function getCombination(id: string) {
  return request<Combination>(`/api/combinations/${id}`)
}

export function createCombination(title?: string) {
  return request<Combination>('/api/combinations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

export function updateCombination(
  id: string,
  data: Partial<Pick<Combination, 'title' | 'description' | 'field' | 'actors' | 'steps'>>,
) {
  return request<Combination>(`/api/combinations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function duplicateCombination(id: string) {
  return request<Combination>(`/api/combinations/${id}/duplicate`, { method: 'POST' })
}

export function deleteCombination(id: string) {
  return request<void>(`/api/combinations/${id}`, { method: 'DELETE' })
}
