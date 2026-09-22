const KEY_PREFIX = 'agenda:notificationsSeenAt:'

export function readLastSeen(turmaId: string): number {
  try {
    return Number(window.localStorage.getItem(KEY_PREFIX + turmaId)) || 0
  } catch {
    return 0
  }
}

export function markNotificationsSeenNow(turmaId: string): number {
  const now = Date.now()
  try {
    window.localStorage.setItem(KEY_PREFIX + turmaId, String(now))
  } catch {
    // localStorage indisponível — o contador de novidades só não some entre sessões.
  }
  return now
}
