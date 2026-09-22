const KEY = 'agenda:mySuggestions'
const MAX_TRACKED = 50

export function readMySuggestionIds(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function addMySuggestionId(id: string) {
  try {
    const ids = [id, ...readMySuggestionIds().filter((existing) => existing !== id)].slice(0, MAX_TRACKED)
    window.localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // localStorage indisponível — a sugestão foi enviada, só não fica rastreável depois.
  }
}

export function removeMySuggestionId(id: string) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(readMySuggestionIds().filter((existing) => existing !== id)))
  } catch {
    // localStorage indisponível — nada a fazer.
  }
}
